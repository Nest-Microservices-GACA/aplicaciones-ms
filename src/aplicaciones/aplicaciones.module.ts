import { ClientsModule, Transport } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Aplicacion, Aplicacionstatus, Checkmarx, Scan, Sourcecode } from './entities';
import { AplicacionesController } from './aplicaciones.controller';
import { AplicacionesService } from './aplicaciones.service';
import { CommonModule } from '../common/common.module';
import { envs, RVIAAC_SERVICE, RVIADOC_SERVICE, RVIAMI_SERVICE, RVIASA_SERVICE } from '../config';

@Module({
  controllers: [AplicacionesController],
  providers: [AplicacionesService],
  imports: [
    TypeOrmModule.forFeature([ 
      Aplicacion, 
      Aplicacionstatus, 
      Checkmarx,
      Scan,
      Sourcecode,
    ]),
    ClientsModule.register([
      { 
        name: RVIAAC_SERVICE, 
        transport: Transport.TCP,
        options: {
          host: envs.ms_host,
          port: envs.rviaac_ms_port
        }
      },
      {
        name: RVIASA_SERVICE, 
        transport: Transport.TCP,
        options: {
          host: envs.ms_host,
          port: envs.rviasa_ms_port
        }
      },
      {
        name: RVIAMI_SERVICE, 
        transport: Transport.TCP,
        options: {
          host: envs.ms_host,
          port: envs.rviami_ms_port
        }
      },
      {
        name: RVIADOC_SERVICE, 
        transport: Transport.TCP,
        options: {
          host: envs.ms_host,
          port: envs.rviadoc_ms_port
        }
      }
    ]),
    CommonModule,
    HttpModule,
  ]
})
export class AplicacionesModule {}
