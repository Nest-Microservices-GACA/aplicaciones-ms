import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AplicacionesService } from './aplicaciones.service';
import { AplicacionesController } from './aplicaciones.controller';
import { Aplicacion, Aplicacionstatus, Checkmarx, Scan, Sourcecode } from './entities';
import { CommonModule } from '../common/common.module';

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
    CommonModule,
  ]
})
export class AplicacionesModule {}
