import { catchError, lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { DataToMS, fileRVIA, NumberAction, ResponseProcess } from './interfaces';
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
      return this.handleError(
        'findAll', 
        500,
        'Hubo un error consultando apps',
        error
      );
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
          500, 
          `App ${ idu_aplicacion } no encontrado`, 
          new Error('App no encontrado')
        )
      }
      
      const newStatus = await this.appStatusRepository.findOneBy({ idu_estatus_aplicacion: newStatusId });
      if(!newStatus){
        return this.handleError(
          'updateStatusApp', 
          500,
          `Status ${ newStatusId } no encontrado`, 
          new Error('Status no encontrado')
        )
      }

      app.applicationstatus = newStatus;
      await this.appRepository.save(app);

      app.nom_aplicacion = this.encryptionService.decrypt(app.nom_aplicacion);
      return app;
      
    } catch (error) {
      return this.handleError(
        'updateStatusApp', 
        500,
        `Hubo un error actualizando estado de app ${idu_aplicacion}`, 
        error
      );
    }
  }

  async createAppWithFiles(createAplicacionDto: CreateAplicacionDto, zipFile: fileRVIA, pdfFile: fileRVIA, user: User ){

    const obj = this.addon.CRvia(this.crviaEnvironment);
    const idu_proyecto = obj.createIDProject();
    const fileParts = zipFile.originalname.split('.');
    const fileExtension = fileParts.pop();
    const dirName = envs.path_projects;
    const appName = fileParts.join('.').replace(/\s+/g, '-');
    const appNameWIdu = idu_proyecto + '_' + appName ;
    
    const zipFilePath = join(dirName, `${appNameWIdu}.${fileExtension}`);
    const zipBuffer = Buffer.from(zipFile.buffer.data);
    await fsExtra.writeFile(zipFilePath, zipBuffer);
    
    const extractPath = join(dirName, appNameWIdu);
    await fsExtra.mkdirp(extractPath);

    try {
      if (zipFile.mimetype === 'application/zip' || zipFile.mimetype === 'application/x-zip-compressed') {
        await fsExtra.createReadStream(zipFilePath)
          .pipe(unzipper.Extract({ path: extractPath }))
          .promise()
          .then(() => {})
          .catch(error => {
            this.handleError('createAppWithFiles', 500, 'Error al descomprimir el archivo .zip', error);
          });
      } else if (zipFile.mimetype === 'application/x-7z-compressed') {
        await new Promise<void>((resolve, reject) => {
          seven.unpack(zipFilePath, extractPath, error => {
            if (error) {
              reject(this.handleError('createAppWithFiles', 500, 'Error al descomprimir el archivo .7z', error));
            }
            resolve();
          });
        });
      }
    } catch (error) {
      this.handleError('createAppWithFiles', 500,'Error durante la descompresión', error);
    }

    const aplicacion = await this.saveAppBD(createAplicacionDto, idu_proyecto, appName, extractPath, user.idu_usuario);
    
    const dataToProcess = { 
      idu_proyecto,
      num_accion: 0,
      numero_empleado: user.numero_empleado,
      path_project: extractPath
    }

    return await this.initProcessRVIA(dataToProcess, aplicacion, createAplicacionDto.num_accion);
  }

  async createAppWithGit(createAplicacionDto: CreateAplicacionUrlDto, user: User, pdfFile: fileRVIA){
    try {
      const repoInfo = this.parseGitHubURL(createAplicacionDto.url);
      if (!repoInfo) {
        this.handleError('createAppWithGit',500,'paserGitHubURL', new Error('Invalid GitHub repository URL'));
      }

      return await this.processRepository(repoInfo.repoName, repoInfo.userName, user, createAplicacionDto ,pdfFile,  'GitHub');

    } catch (error) {
      return this.handleError('createAppWithGit',500,'Error al crear app con github', error);
    }
  }

  private async processRepository(repoName: string, repoUserName: string, user: User, infoApp: CreateAplicacionDto,  file, platform: string) {

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
      return this.handleError('processRepository',500,'Error al crear app con github', new Error('No se encontró ninguna rama válida (main o master)'));
    }

    const response = await lastValueFrom(
      this.httpService.get(zipUrl, { responseType: 'stream' }).pipe(
        catchError(error => {
          return [];
        }),
      ),
    );

    if (response.length === 0) {
      return this.handleError('processRepository',500, 'Error al descargar el repositorio', new Error('Error al descargar el repositorio'));
    }

    try {

      await streamPipeline(response.data, fs.createWriteStream(repoFolderPath));
      console.log(appNameWIdu);
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

      return await this.initProcessRVIA(dataToProcess, aplicacion, infoApp.num_accion);
      
    } catch (error) {
      await fsExtra.remove(finalFolder);
      await fsExtra.remove(repoFolderPath);
      return this.handleError('processRepository',500,'Error al procesar el repositorio', error);

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

  private async saveAppBD(infoApp: CreateAplicacionDto, idu_proyecto: string, appName: string,nom_dir:string, idu_usuario: number){
    const sourcecode = this.sourceCodeRepository.create({
      nom_codigo_fuente: this.encryptionService.encrypt(appName),
      nom_directorio: this.encryptionService.encrypt(nom_dir),
    });

    try { 
      await this.sourceCodeRepository.save(sourcecode);

    }catch(error) {
      this.handleError('saveAppBD',500,'Error al guardar sourcecode en BD', error);
    }

    let estatu = await this.appStatusRepository.findOneBy({ idu_estatus_aplicacion: 2 });  
    if(!estatu){
      this.handleError(
        'saveAppBD', 
        500,
        `Status ${ 2 } no encontrado`, 
        new Error('Status no encontrado')
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
      this.handleError('processRepository',500,'Error al guardar aplicacion en BD', error);
    } 

    await this.appRepository.save(aplicacion);
    return aplicacion;
  }
  
  private async initProcessRVIA(data: DataToMS, aplicacion: Aplicacion, num_accion: number){
    let rviaProcess: ResponseProcess = { isProcessStarted: false, message: 'Error al crear el app y num_accion' };

    if(num_accion === NumberAction.UPDATECODE){
      data.num_accion = NumberAction.UPDATECODE;
      rviaProcess = await this.initUpdateCode(data);
    }

    if(num_accion === NumberAction.SANITIZECODE){
      
      let pdfProcess;
      // TODO llamar ms para guardar pdf
      // if(pdfFile){
      //   pdfProcess = await this.saveDocument(pdfFile,idu_proyecto);
      //   console.log(rviaProcess);
      // } else {

      //   this.handleError(
      //     'createAppWithFiles', 
      //     `Error al guardar el pdf de sanitización`, 
      //     new Error('pdf no encontrado')
      //   )
      //   let rviaProcess = { isProcessStarted: false, message: 'Error al crear el app y no se tiene pdf' };      
      // }

      // TODO llamar al ms de sanitización
      // if(pdfProcess.isProcessStarted){
        // dataToProcess.num_accion = NumberAction.SANITIZECODE;
        // rviaProcess = await this.initSanitizeCode(dataToProcess);
        // console.log(rviaProcess);
      // }
    }

    if(num_accion === NumberAction.MIGRATIONCODE){
      data.num_accion = NumberAction.MIGRATIONCODE;
      rviaProcess = await this.initMigrationCode(data);
    }
    
    aplicacion.nom_aplicacion = this.encryptionService.decrypt(aplicacion.nom_aplicacion);

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

  private async saveDocument(file: fileRVIA, idu_aplicacion: number){
    try{
      return lastValueFrom(this.client.send('rviadoc.find_one', {id: idu_aplicacion} ));
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
  
  private handleError(method:string, status: number, message: string, error: any){
    this.logger.error(`[aplicaciones.${ method }.service]`,error);
    throw new RpcException({
      status,
      message: `${message}: ${error}`,
    });
  }
}
