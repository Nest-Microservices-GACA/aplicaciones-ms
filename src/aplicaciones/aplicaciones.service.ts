import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import * as unzipper from 'unzipper';
import * as seven from '7zip-min';

import { CreateAplicacionDto, User } from './dto';
import { Aplicacion, Aplicacionstatus } from './entities';
import { CommonService } from '../common/common.service';
import { fileRVIA, NumberAction } from './interfaces';
import { envs } from '../config';
import { lastValueFrom } from 'rxjs';


@Injectable()
export class AplicacionesService implements OnModuleInit {
  private client: ClientProxy;
  private readonly logger = new Logger('AplicationService');
  private readonly crviaEnvironment: number;
  private readonly addon: any;

  constructor(
    @InjectRepository(Aplicacion)
    private readonly appRepository: Repository<Aplicacion>,
    private readonly encryptionService: CommonService,
    @InjectRepository(Aplicacionstatus)
    private readonly appStatusRepository: Repository<Aplicacionstatus>, 
    private readonly configService: ConfigService
  ){
    const rviaPath = this.configService.get<string>('RVIA_PATH');
    if (!rviaPath) {
      throw new Error('La variable de entorno RVIA_PATH no está definida');
    }

    this.addon = require(rviaPath);
    this.crviaEnvironment = Number(this.configService.get('RVIA_ENVIRONMENT'));
  }

  onModuleInit() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: this.configService.get<string>('UPDATE_MS_HOST'),
        port: this.configService.get<number>('UPDATE_MS_PORT'),
      },
    });
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

    console.log(createAplicacionDto);
    const obj = this.addon.CRvia(this.crviaEnvironment);
    const iduProject = obj.createIDProject();
    console.log('id: ' + iduProject);
    const fileParts = zipFile.originalname.split('.');
    const fileExtension = fileParts.pop();
    const dirName = envs.path_projects;
    const appName = iduProject + '_' + fileParts.join('.').replace(/\s+/g, '-');
    
    const zipFilePath = join(dirName, `${appName}.${fileExtension}`);
    const zipBuffer = Buffer.from(zipFile.buffer.data);
    fs.writeFileSync(zipFilePath, zipBuffer);
    
    const extractPath = join(dirName, appName);
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

    if(createAplicacionDto.num_accion === NumberAction.UPDATECODE){
      // TODO llamar al ms de actualización
      // const result = await this.initUpdateCode(iduProject,appName);
      // console.log(result);
    }

    if(createAplicacionDto.num_accion === NumberAction.SANITIZECODE){
      // TODO llamar ms para guardar pdf
      // TODO llamar al ms de sanitización

    }

    if(createAplicacionDto.num_accion === NumberAction.MIGRATIONCODE){
      // TODO llamar al ms de migración
    }

    

    return 'Aqui crearemos una app'
  }

  async initUpdateCode(idu_aplicacion: number, nomDir: string){
    return lastValueFrom(this.client.send('', { }));
  }

  async saveDocument(file: fileRVIA, idu_aplicacion: number){
    return lastValueFrom(this.client.send('', { }));
  }

  async initSanitizeCode(idu_aplicacion: number, nomDir: string){
    return lastValueFrom(this.client.send('', { }));
  }

  async initMigrationCode(idu_aplicacion: number, nomDir: string){
    return lastValueFrom(this.client.send('', { }));
  }
  
  private handleError(method:string, message: string, error: any){
    this.logger.error(`[aplicaciones.${ method }.service]`,error);
    throw new RpcException({
      status: 'Error',
      message: `${message}: ${error}`,
    });
  }
}
