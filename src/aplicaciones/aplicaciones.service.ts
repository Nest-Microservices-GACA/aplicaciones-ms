import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from './dto';
import { Aplicacion, Aplicacionstatus } from './entities';
import { Repository } from 'typeorm';
import { CommonService } from '../common/common.service';

@Injectable()
export class AplicacionesService {

  private readonly logger = new Logger('AplicationService');
  constructor(
    @InjectRepository(Aplicacion)
    private readonly appRepository: Repository<Aplicacion>,
    private readonly encryptionService: CommonService,
    @InjectRepository(Aplicacionstatus)
    private readonly appStatusRepository: Repository<Aplicacionstatus>, 
  ){}

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
        this.handleErrorDB(
          'updateStatusApp', 
          `App ${ idu_aplicacion } no encontrado`, 
          new Error('App no encontrado')
        )
      }
      
      const newStatus = await this.appStatusRepository.findOneBy({ idu_estatus_aplicacion: newStatusId });
      if(!newStatus){
        this.handleErrorDB(
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

      this.handleErrorDB(
        'updateStatusApp', 
        `Hubo un error actualizando estado de app ${idu_aplicacion}`, 
        error
      );
    }
  }


  private handleErrorDB(method:string, message: string, error: any){
    this.logger.error(`[aplicaciones.${ method }.service]`,error);
    throw new RpcException({
      status: 'Error',
      message: `${message}: ${error}`,
    });
  }
}
