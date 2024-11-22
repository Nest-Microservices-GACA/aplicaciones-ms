import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AplicacionesModule } from './aplicaciones/aplicaciones.module';
import { envs } from './config';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type:'postgres',
      host: envs.dbHost,
      port: envs.dbPort,
      database: envs.dbName,
      username: envs.dbUsername,
      password: envs.dbPassword,
      autoLoadEntities: true,
      synchronize:false
    }),

    AplicacionesModule,
    CommonModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
