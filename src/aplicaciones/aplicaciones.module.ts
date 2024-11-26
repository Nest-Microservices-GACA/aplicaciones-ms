import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AplicacionesService } from './aplicaciones.service';
import { AplicacionesController } from './aplicaciones.controller';
import { Aplicacion, Aplicacionstatus, Checkmarx, Scan, Sourcecode } from './entities';
import { CommonModule } from '../common/common.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { envs, RVIAAC_SERVICE, RVIADOC_SERVICE, RVIAMI_SERVICE, RVIASA_SERVICE } from 'src/config';

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
  ]
})
export class AplicacionesModule {}
