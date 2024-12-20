import { catchError, lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { join } from 'path'; 
import { pipeline } from 'stream';
import { promisify } from 'util';
import { RpcException } from '@nestjs/microservices';
import * as fs from 'fs';

import { Repository } from 'typeorm';
import * as fsExtra from 'fs-extra';
import * as seven from '7zip-min';
import * as unzipper from 'unzipper';

import { Aplicacion, Aplicacionstatus, Sourcecode } from './entities';
import { CommonService } from '../common/common.service';
import { CreateAplicacionDto, CreateAplicacionUrlDto, User } from './dto';
import { DataToMS, DataToPython, fileRVIA, NumberAction, ResponseProcess, StatusApp } from './interfaces';
import { envs, NATS_SERVICE } from '../config';

@Injectable()
export class AplicacionesService {
  private readonly logger = new Logger('AplicationService');
  private readonly crviaEnvironment: number;
  private readonly addon: any;

  constructor(
    @InjectRepository(Aplicacion)
    private readonly appRepository: Repository<Aplicacion>,
    @InjectRepository(Aplicacionstatus)
    private readonly appStatusRepository: Repository<Aplicacionstatus>, 
    @InjectRepository(Sourcecode)
    private readonly sourceCodeRepository: Repository<Sourcecode>,
    private readonly encryptionService: CommonService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(NATS_SERVICE)  private readonly client:  ClientProxy,
  ){
    const rviaPath = this.configService.get<string>('RVIA_PATH');
  
    this.addon = require(rviaPath);
    this.crviaEnvironment = Number(this.configService.get('RVIA_ENVIRONMENT'));
  }

  async findAll(user: User) {
    try{

      const queryBuilder = this.appRepository.createQueryBuilder('application')
      .leftJoinAndSelect('application.checkmarx', 'checkmarx')
      .leftJoinAndSelect('application.sourcecode', 'sourcecode')
      .orderBy('application.fec_creacion', 'ASC');

      if (user.rol?.idu_rol !== 1) {
        queryBuilder.where('application.idu_usuario = :userId', { userId: user.idu_usuario });
      }

      const aplicaciones = await queryBuilder.getMany();

      aplicaciones.forEach( app => {
        app.nom_aplicacion = this.encryptionService.decrypt(app.nom_aplicacion);
        app.sourcecode.nom_codigo_fuente = this.encryptionService.decrypt(app.sourcecode.nom_codigo_fuente);

        if (app.checkmarx && app.checkmarx.length > 0){
          app.checkmarx.forEach(checkmarx => { 
            checkmarx.nom_checkmarx = this.encryptionService.decrypt(checkmarx.nom_checkmarx);
          });
        }

      });

      return { aplicaciones, total: aplicaciones.length };

    } catch (error) {
      this.handleError('findAll',error);
    }
  }

  async findOne(idu_proyecto: number) {
    try{

      const queryBuilder = this.appRepository.createQueryBuilder('application')
      .leftJoinAndSelect('application.checkmarx', 'checkmarx')
      .leftJoinAndSelect('application.sourcecode', 'sourcecode')
      .where('application.idu_proyecto = :idu_proyecto', { idu_proyecto });

      const app = await queryBuilder.getOne();

      if(!app){
        this.handleError(
          'findOne', 
          new NotFoundException(`Aplicación no encontrada: ${idu_proyecto}`)
        );
      }

      app.nom_aplicacion = this.encryptionService.decrypt(app.nom_aplicacion);
      app.sourcecode.nom_codigo_fuente = this.encryptionService.decrypt(app.sourcecode.nom_codigo_fuente);

      if (app.checkmarx && app.checkmarx.length > 0){
        app.checkmarx.forEach(checkmarx => { 
          checkmarx.nom_checkmarx = this.encryptionService.decrypt(checkmarx.nom_checkmarx);
        });
      }

      return app;
      
    } catch (error) {
      this.handleError('findOne',error);
    }
  }

  async updateStatusApp(idu_aplicacion: number, newStatusId: number) {
    try{

      const app = await this.appRepository.findOne({
        where: { idu_aplicacion },
        relations: ['applicationstatus'],
      });

      if (!app){
        this.handleError(
          'updateStatusApp', 
          new NotFoundException('Aplicación no encontrada')
        )
      }
      
      const newStatus = await this.appStatusRepository.findOneBy({ idu_estatus_aplicacion: newStatusId });
      if(!newStatus){
        this.handleError(
          'updateStatusApp', 
          new NotFoundException('Status no encontrado')
        )
      }

      app.applicationstatus = newStatus;
      await this.appRepository.save(app);

      app.nom_aplicacion = this.encryptionService.decrypt(app.nom_aplicacion);
      return app;
      
    } catch (error) {
      this.handleError(
        'updateStatusApp', 
        error
      );
    }
  }

  async createAppWithFiles(createAplicacionDto: CreateAplicacionDto, appName:string, zipFile: string, pdfFile: string | null, fileType: string, user: User ){

    const obj = this.addon.CRvia(this.crviaEnvironment);
    const idu_proyecto = obj.createIDProject();
    const dirName = envs.path_projects;

    const fileParts = appName.split('.');
    const fileExtension = fileParts.pop();
    const newAppName = fileParts.join('.').replace(/\s+/g, '-');   
    const appNameWIdu = idu_proyecto + '_' + newAppName ;

    const oldPath = `${dirName}/${zipFile}`; 
    const newPath = `${dirName}/${idu_proyecto}_${appName}`;
    
    try {
      await fsExtra.rename(oldPath, newPath);
    } catch (error) {
      this.handleError(
        'createAppWithFiles', 
        new InternalServerErrorException(`Error al renombrar el archivo: ${error.message}`)
      )
    }
    
    const extractPath = join(dirName, appNameWIdu);
    await fsExtra.mkdirp(extractPath);

    try {
      if (fileType === 'application/zip' || fileType === 'application/x-zip-compressed') {
        await fsExtra.createReadStream(newPath)
          .pipe(unzipper.Extract({ path: extractPath }))
          .promise()
          .then(() => {})
          .catch(error => {
            this.handleError(
              'createAppWithFiles', 
              new InternalServerErrorException(`Error al descomprimir el archivo .zip: ${error.message}`)
            )
          });
      } else if (fileType === 'application/x-7z-compressed') {
        await new Promise<void>((resolve, reject) => {
          seven.unpack(newPath, extractPath, error => {
            if (error) {
              reject(
                this.handleError(
                  'createAppWithFiles', 
                  new InternalServerErrorException(`Error al descomprimir el archivo .7z: ${error.message}`)
                )
              );
            }
            resolve();
          });
        });
      } else {
        this.handleError(
          'createAppWithFiles', 
          new UnsupportedMediaTypeException('Formato de archivo no soportado')
        );
      }
    } catch (error) {
      this.handleError(
        'createAppWithFiles', 
        new InternalServerErrorException(`Error al descomprimir el archivo: ${error.message}`)
      );
    }

    const aplicacion = await this.saveAppBD(createAplicacionDto, idu_proyecto, newAppName, extractPath, user.idu_usuario);

    const dataToProcess = { 
      idu_proyecto,
      num_accion: 0,
      numero_empleado: user.numero_empleado,
      path_project: extractPath
    }

    return await this.initProcessRVIA(dataToProcess, aplicacion, createAplicacionDto.num_accion,pdfFile);
  }

  async createAppWithGit(createAplicacionDto: CreateAplicacionUrlDto, user: User, pdfFile: string){
    try {
      const repoInfo = this.parseGitHubURL(createAplicacionDto.url);
      if (!repoInfo) {
        this.handleError(
          'createAppWithGit', 
          new BadRequestException('URL invalida de repositorio de GitHub')
        );
      }

      return await this.processRepository(repoInfo.repoName, repoInfo.userName, user, createAplicacionDto , pdfFile, 'GitHub');

    } catch (error) {
      this.handleError('createAppWithGit', error);
    }
  }

  async createAppWithGitLab(createAplicacionDto: CreateAplicacionUrlDto, user: User, pdfFile: string){

    try {
      const repoInfo = this.getRepoInfo(createAplicacionDto.url);
      if (!repoInfo) {
        this.handleError(
          'createAppWithGit', 
          new BadRequestException('URL invalida de repositorio de GitLab')
        );
      }

      return await this.processRepository(repoInfo.repoName, `${repoInfo.userName}/${repoInfo.groupName}`, user, createAplicacionDto , pdfFile, 'GitLab');

    } catch (error) {
      this.handleError('createAppWithGit', error);
    }
  }

  async downloadFile7z(idu_proyecto: number): Promise<{ status: boolean; message: string; fileName: string; filePath: string }> {
    try {
      // Buscar la aplicación
      const app = await this.appRepository.findOne({
        where: { idu_proyecto: `${idu_proyecto}` },
        relations: ['applicationstatus'],
      });

      if (!app) {
        throw new NotFoundException(`Aplicación no encontrada: ${idu_proyecto}`);
      }

      // Validar el estado de la aplicación
      if (app.applicationstatus.idu_estatus_aplicacion !== StatusApp.DONE) {
        throw new InternalServerErrorException(
          `Aplicación no TERMINADA para descargar: ${idu_proyecto}`,
        );
      }

      // Construir la ruta al archivo
      const dirName = envs.path_projects;
      const decryptedAppName = this.encryptionService.decrypt(app.nom_aplicacion);
      const filePath = join(dirName, `${app.idu_proyecto}_${decryptedAppName}.7z`);

      // Validar la existencia del archivo
      if (!fs.existsSync(filePath)) {
        throw new NotFoundException(
          `Archivo ${app.idu_proyecto}_${decryptedAppName}.7z no encontrado`,
        );
      }

      // Si todo está bien, retornar el éxito
      return {
        status: true,
        message: 'Archivo listo para descargar.',
        fileName: `${app.idu_proyecto}_${decryptedAppName}.7z`,
        filePath: filePath
      };
    } catch (error) {
      // Manejo centralizado de errores
      return {
        status: false,
        message: error.message || 'Error desconocido al descargar el archivo.',
        filePath: '',
        fileName: '',
      };
    }
  }

  private async processRepository(repoName: string, repoUserName: string, user: User, infoApp: CreateAplicacionDto,  file: string | null, platform: string) {

    const obj = this.addon.CRvia(this.crviaEnvironment);
    const idu_proyecto = obj.createIDProject();

    const streamPipeline = promisify(pipeline);
    const dirName = envs.path_projects;
    const appNameWIdu = `${idu_proyecto}_${repoName}`
    const repoFolderPath = join(dirName, `${appNameWIdu}.zip`);
    const finalFolder = join(dirName, appNameWIdu);

    const branches = ['main','master'];
    let zipUrl: string | null = null;

    for (const branch of branches) {
      const potentialUrl = platform === 'GitHub'
        ? `https://github.com/${repoUserName}/${repoName}/archive/refs/heads/${branch}.zip`
        : `https://gitlab.com/${repoUserName}/${repoName}/-/archive/${branch}/${repoName}-${branch}.zip`;

      try {
        await lastValueFrom(this.httpService.head(potentialUrl));
        zipUrl = potentialUrl;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!zipUrl) {
      this.handleError(
        'processRepository',
        new BadRequestException('No se encontró ninguna rama válida (main o master)')
      );
    }

    const response = await lastValueFrom(
      this.httpService.get(zipUrl, { responseType: 'stream' }).pipe(
        catchError(error => {
          return [];
        }),
      ),
    );

    if (response.length === 0) {
      this.handleError(
        'processRepository', 
        new InternalServerErrorException('Error al descargar el repositorio')
      );
    }

    try {

      await streamPipeline(response.data, fs.createWriteStream(repoFolderPath));
      const tempFolderPath = join(dirName, `temp-${appNameWIdu}`);
      
      await unzipper.Open.file(repoFolderPath)
        .then(d => d.extract({ path: tempFolderPath }))
        .then(async () => {
          const extractedFolders = await fsExtra.readdir(tempFolderPath);
          const extractedFolder = join(tempFolderPath, extractedFolders.find(folder => folder.includes(repoName)));

          await fsExtra.ensureDir(finalFolder);
          await fsExtra.copy(extractedFolder, finalFolder);
          await fsExtra.remove(tempFolderPath);
        });

      const aplicacion = await this.saveAppBD(infoApp, idu_proyecto, repoName, finalFolder, user.idu_usuario);
      
      const dataToProcess = { 
        idu_proyecto,
        num_accion: 0,
        numero_empleado: user.numero_empleado,
        path_project: finalFolder
      }

      return await this.initProcessRVIA(dataToProcess, aplicacion, infoApp.num_accion,file);
      
    } catch (error) {
      await fsExtra.remove(finalFolder);
      await fsExtra.remove(repoFolderPath);
      return this.handleError(
        'processRepository', 
        new InternalServerErrorException(`Error al procesar el repositorio: ${error.message}`)
      );
    }
    
  }

  private parseGitHubURL(url: string): { repoName: string, userName: string } | null {
    const regex = /github\.com\/([^\/]+)\/([^\/]+)\.git$/;
    const match = url.match(regex);
    if (match) {
      return { userName: match[1], repoName: match[2] };
    }
    return null;
  }

  private getRepoInfo(url: string): { userName: string, groupName: string, repoName: string } | null {
    try {
      const { pathname } = new URL(url);

      const pathSegments = pathname.split('/').filter(segment => segment);

      if (pathSegments.length > 0 && pathSegments[pathSegments.length - 1].endsWith('.git')) {
        const repoName = pathSegments.pop()!.replace('.git', '');
        const groupName = pathSegments.pop()!;
        const userName = pathSegments.join('/');

        return {
          userName,
          groupName,
          repoName
        };
      }
    } catch (error) {
      
    }

    return null;
  }

  private async saveAppBD(infoApp: CreateAplicacionDto, idu_proyecto: string, appName: string,nom_dir:string, idu_usuario: number){
    const sourcecode = this.sourceCodeRepository.create({
      nom_codigo_fuente: this.encryptionService.encrypt(appName),
      nom_directorio: this.encryptionService.encrypt(nom_dir),
    });
    
    try { 
      await this.sourceCodeRepository.save(sourcecode);

    }catch(error) {
      this.handleError(
        'saveAppBD',
        new InternalServerErrorException(`Error al guardar el código fuente: ${error.message}`) 
      );
    }

    let estatu = await this.appStatusRepository.findOneBy({ idu_estatus_aplicacion: 2 });  
    if(!estatu){
      this.handleError(
        'saveAppBD', 
        new NotFoundException('Status no encontrado')
      )
    }

    estatu.des_estatus_aplicacion = this.encryptionService.decrypt(estatu.des_estatus_aplicacion);  
    const aplicacion = new Aplicacion();
    
    try {
      const opciones = infoApp.opc_arquitectura;

      aplicacion.nom_aplicacion = this.encryptionService.encrypt(appName);
      aplicacion.idu_proyecto = idu_proyecto;
      aplicacion.num_accion = infoApp.num_accion;
      aplicacion.opc_arquitectura = infoApp.opc_arquitectura || {"1": false, "2": false, "3": false, "4": false};
      aplicacion.opc_lenguaje = infoApp.opc_lenguaje;
      aplicacion.opc_estatus_doc = opciones['1'] ? 2 : 0;
      aplicacion.opc_estatus_doc_code = opciones['2'] ? 2 : 0;
      aplicacion.opc_estatus_caso = opciones['3'] ? 2 : 0;
      aplicacion.opc_estatus_calificar = opciones['4'] ? 2 : 0;
      aplicacion.applicationstatus = estatu;
      aplicacion.sourcecode = sourcecode;
      aplicacion.idu_usuario = idu_usuario;
      
    }catch(error) {
      this.handleError(
        'processRepository', 
        new InternalServerErrorException(`Error al guardar la aplicación: ${error.message}`)
      );
    } 

    await this.appRepository.save(aplicacion);
    return aplicacion;
  }
  
  private async initProcessRVIA(data: DataToMS, aplicacion: Aplicacion, num_accion: number, pdfFile: string){
    let rviaProcess: ResponseProcess = { isProcessStarted: false, message: 'Error al crear el app y num_accion' };
    aplicacion.nom_aplicacion = this.encryptionService.decrypt(aplicacion.nom_aplicacion);

    if(num_accion === NumberAction.UPDATECODE){
      data.num_accion = NumberAction.UPDATECODE;
      rviaProcess = await this.initUpdateCode(data);
    }

    if(num_accion === NumberAction.SANITIZECODE){
      let pdfProcess: { message: string; error?: string; isValid?: boolean; checkmarx?: any };
      
      if(pdfFile){
        const dataPython: DataToPython = {
          idu_proyecto: data.idu_proyecto,
          idu_aplicacion: aplicacion.idu_aplicacion,
          nom_aplicacion: aplicacion.nom_aplicacion,
          pdfFile
        }

        pdfProcess = await this.saveDocument(dataPython);
        
        if(pdfProcess.isValid){
          data.num_accion = NumberAction.SANITIZECODE;
          rviaProcess = await this.initSanitizeCode(data);
        }else{
          rviaProcess = { isProcessStarted: false, message: pdfProcess.message };      
        }

      } else {
        rviaProcess = { isProcessStarted: false, message: 'Error falta PDF para sanitización' };      
      }

    }

    if(num_accion === NumberAction.MIGRATIONCODE){
      data.num_accion = NumberAction.MIGRATIONCODE;
      rviaProcess = await this.initMigrationCode(data);
    }
    
    return {
      aplicacion,
      rviaProcess
    }

  }

  private async initUpdateCode(data: DataToMS){
    try {
      return await lastValueFrom(this.client.send('createActualizacion', { ...data }));
    } catch (error) {
      return { isProcessStarted: false, message: `Error iniciando el proceso de actualización: ${error}` };
    }
  }

  private async saveDocument(data: DataToPython ){
    try{      
      return lastValueFrom(this.client.send(
        'rviadoc.upload_pdf', 
        data  
      )
      );
    } catch (error) {
      return { isProcessStarted: false, message: `Error al guardar el documento: ${error}` };
    }
  }

  private async initSanitizeCode(data: DataToMS){
    try{
      return lastValueFrom(this.client.send('createSanitizacion', {...data }));
    } catch (error) {
      return { isProcessStarted: false, message: `Error iniciando el proceso de sanitización: ${error}` };
    }
  }

  private async initMigrationCode(data: DataToMS){
    try{
      return lastValueFrom(this.client.send('rvia.migracion.proyecto', { ...data }));
    } catch (error) {
      return { isProcessStarted: false, message: `Error iniciando el proceso de migración: ${error}` }; 
    }
  }
  
  private handleError(method:string, error: any){
    this.logger.error(`[aplicaciones.${ method }]`,error);

    if (error.code === '23505'){
      throw new RpcException({
        status: 400,
        message: error.detail,
      });
    }

    if (error.response){
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }

    if(error.error){
      throw new RpcException({
        status: error.error.status,
        message: error.error.message,
      });  
    }

    throw new RpcException({
      status: 500,
      message: 'Error en el servidor',
    });
  }
}
