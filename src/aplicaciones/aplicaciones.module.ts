import { ClientsModule, Transport } from '@nestjs/microservices';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Aplicacion, Aplicacionstatus, Checkmarx, Scan, Sourcecode } from './entities';
import { AplicacionesController } from './aplicaciones.controller';
import { AplicacionesService } from './aplicaciones.service';
import { CommonModule } from '../common/common.module';
import { envs, NATS_SERVICE } from '../config';

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
        name: NATS_SERVICE, 
        transport: Transport.NATS,
        options: {
          servers: envs.natsServers
        }
      },
    ]),
    CommonModule,
    HttpModule,
  ]
})
export class AplicacionesModule {}
