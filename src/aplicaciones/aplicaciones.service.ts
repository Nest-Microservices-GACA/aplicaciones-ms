import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import * as unzipper from 'unzipper';
import * as seven from '7zip-min';

import { CreateAplicacionDto, User } from './dto';
import { Aplicacion, Aplicacionstatus, Sourcecode } from './entities';
import { CommonService } from '../common/common.service';
import { DataToMS, fileRVIA, NumberAction, ResponseProcess } from './interfaces';
import { envs, RVIAAC_SERVICE, RVIAMI_SERVICE } from '../config';

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
    @Inject(RVIAMI_SERVICE) private readonly rviamiClient: ClientProxy,
    @Inject(RVIAAC_SERVICE) private readonly rviaacClient: ClientProxy,
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

      if (user.position?.idu_rol !== 1) {
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

      this.logger.error('[aplicaciones.findAllAppTestCases.service]',error);
      throw new RpcException({
        status: 'Error',
        message: `Hubo un error consultando apps: ${error}`,
      });
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
          `App ${ idu_aplicacion } no encontrado`, 
          new Error('App no encontrado')
        )
      }
      
      const newStatus = await this.appStatusRepository.findOneBy({ idu_estatus_aplicacion: newStatusId });
      if(!newStatus){
        this.handleError(
          'updateStatusApp', 
          `Status ${ newStatusId } no encontrado`, 
          new Error('Status no encontrado')
        )
      }

      app.applicationstatus = newStatus;
      await this.appRepository.save(app);

      app.nom_aplicacion = this.encryptionService.decrypt(app.nom_aplicacion);
      return app;
      
    } catch (error) {

      this.handleError(
        'updateStatusApp', 
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
    fs.writeFileSync(zipFilePath, zipBuffer);
    
    const extractPath = join(dirName, appNameWIdu);
    fs.mkdirSync(extractPath, { recursive: true });
    if (zipFile.mimetype === 'application/zip' || zipFile.mimetype === 'application/x-zip-compressed') {
      await fs.createReadStream(zipFilePath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .promise()
        .then(() => {})
        .catch(error => {
          this.handleError('createAppWithFiles', 'Error al descomprimir el archivo .zip', error);
        });
    }else if (zipFile.mimetype === 'application/x-7z-compressed') {
      await new Promise<void>((resolve, reject) => {
        seven.unpack(zipFilePath, extractPath, error => {
          if (error) {
            reject(this.handleError('createAppWithFiles','Error al descomprimir el archivo .7z', error));
          }
          
          resolve();
        });
      });
    }

    const sourcecode = this.sourceCodeRepository.create({
      nom_codigo_fuente: this.encryptionService.encrypt(appName),
      nom_directorio: this.encryptionService.encrypt(extractPath),
    });
    
    try { 
      await this.sourceCodeRepository.save(sourcecode);

    }catch(error) {
      this.handleError('createAppWithFiles','Error al guardar sourcecode en BD', error);
    }

    let estatu = await this.appStatusRepository.findOneBy({ idu_estatus_aplicacion: 2 });  
    if(!estatu){
      this.handleError(
        'updateStatusApp', 
        `Status ${ 2 } no encontrado`, 
        new Error('Status no encontrado')
      )
    }

    estatu.des_estatus_aplicacion = this.encryptionService.decrypt(estatu.des_estatus_aplicacion);
    
    const aplicacion = new Aplicacion();

    try {
      const opciones = createAplicacionDto.opc_arquitectura;

      aplicacion.nom_aplicacion = this.encryptionService.encrypt(appName);
      aplicacion.idu_proyecto = idu_proyecto;
      aplicacion.num_accion = createAplicacionDto.num_accion;
      aplicacion.opc_arquitectura = createAplicacionDto.opc_arquitectura || {"1": false, "2": false, "3": false, "4": false};
      aplicacion.opc_lenguaje = createAplicacionDto.opc_lenguaje;
      aplicacion.opc_estatus_doc = opciones['1'] ? 2 : 0;
      aplicacion.opc_estatus_doc_code = opciones['2'] ? 2 : 0;
      aplicacion.opc_estatus_caso = opciones['3'] ? 2 : 0;
      aplicacion.opc_estatus_calificar = opciones['4'] ? 2 : 0;
      aplicacion.applicationstatus = estatu;
      aplicacion.sourcecode = sourcecode;
      aplicacion.idu_usuario = user.idu_usuario;
      
    }catch(error) {
      this.handleError('createAppWithFiles','Error al guardar aplicacion en BD', error);
    } 

    await this.appRepository.save(aplicacion);

    const dataToProcess = { 
      idu_proyecto,
      num_accion: 0,
      numero_empleado: user.numero_empleado,
      path_project: extractPath
    }
    
    let rviaProcess = { isProcessStarted: false, message: 'Error al crear el app y num_accion' };

    if(createAplicacionDto.num_accion === NumberAction.UPDATECODE){
      dataToProcess.num_accion = NumberAction.UPDATECODE;
      rviaProcess = await this.initUpdateCode(dataToProcess);
    }

    // if(createAplicacionDto.num_accion === NumberAction.SANITIZECODE){
    //   // TODO llamar ms para guardar pdf
    //   // TODO llamar al ms de sanitización

    // }

    if(createAplicacionDto.num_accion === NumberAction.MIGRATIONCODE){
      dataToProcess.num_accion = NumberAction.MIGRATIONCODE;
      rviaProcess = await this.initMigrationCode(dataToProcess);
    }
    
    return {
      aplicacion,
      rviaProcess
    }
  }

  async initUpdateCode(data: DataToMS){
    return lastValueFrom(this.rviaacClient.send('createActualizacion', { ...data }));
  }

  async saveDocument(file: fileRVIA, idu_aplicacion: number){
    // return lastValueFrom(this.client.send('', { }));
  }

  async initSanitizeCode(idu_aplicacion: number, nomDir: string){
    // return lastValueFrom(this.client.send('', { }));
  }

  async initMigrationCode(data: DataToMS){
    return lastValueFrom(this.rviamiClient.send('rvia.migracion.proyecto', { ...data }));
  }
  
  private handleError(method:string, message: string, error: any){
    this.logger.error(`[aplicaciones.${ method }.service]`,error);
    throw new RpcException({
      status: 'Error',
      message: `${message}: ${error}`,
    });
  }
}
