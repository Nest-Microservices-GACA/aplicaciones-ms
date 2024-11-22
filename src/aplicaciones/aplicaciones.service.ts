import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from './dto';
import { Aplicacion } from './entities';
import { Repository } from 'typeorm';
import { CommonService } from '../common/common.service';

@Injectable()
export class AplicacionesService {

  private readonly logger = new Logger('AplicationService');
  constructor(
    @InjectRepository(Aplicacion)
    private readonly appRepository: Repository<Aplicacion>,
    private readonly encryptionService: CommonService,
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

  // create(createAplicacioneDto: CreateAplicacioneDto) {
  //   return 'This action adds a new aplicacione';
  // }


  // findOne(id: number) {
  //   return `This action returns a #${id} aplicacione`;
  // }

  // update(id: number, updateAplicacioneDto: UpdateAplicacioneDto) {
  //   return `This action updates a #${id} aplicacione`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} aplicacione`;
  // }
}
