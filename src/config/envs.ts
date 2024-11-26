import 'dotenv/config';

import * as joi from 'joi';

interface EnvVars {
  DB_HOST: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_PORT: number;

  APP_MS_PORT: number;
  MS_HOST:string;

  RVIAAC_MICROSERVICE_PORT: number;
  RVIASA_MICROSERVICE_PORT: number;
  RVIAMI_MICROSERVICE_PORT: number;
  RVIADOC_MICROSERVICE_PORT: number;

  PATH_PROJECTS: string; 
  RVIA_ENVIRONMENT: number;
  RVIA_PATH: string;
}

const envsSchema = joi.object({
  DB_HOST: joi.string().required(),
  DB_USERNAME: joi.string().required(),
  DB_PASSWORD: joi.string().required(),
  DB_NAME: joi.string().required(),
  DB_PORT: joi.number().required(),

  APP_MS_PORT: joi.number().required(),
  MS_HOST: joi.string().required(),

  RVIAAC_MICROSERVICE_PORT: joi.number().required(),
  RVIASA_MICROSERVICE_PORT: joi.number().required(),
  RVIAMI_MICROSERVICE_PORT: joi.number().required(),
  RVIADOC_MICROSERVICE_PORT: joi.number().required(),

  PATH_PROJECTS: joi.string().required(), 
  RVIA_ENVIRONMENT: joi.number().required(),
  RVIA_PATH: joi.string().required()
})
.unknown(true);

const { error, value } = envsSchema.validate( process.env );


if ( error ) {
  throw new Error(`Config validation error: ${ error.message }`);
}

const envVars:EnvVars = value;

export const envs = {
  dbHost: envVars.DB_HOST,
  dbUsername: envVars.DB_USERNAME,
  dbPassword: envVars.DB_PASSWORD,
  dbName: envVars.DB_NAME,
  dbPort: envVars.DB_PORT,

  apps_ms_port:  envVars.APP_MS_PORT,
  ms_host: envVars.MS_HOST,

  rviaac_ms_port: envVars.RVIAAC_MICROSERVICE_PORT,
  rviasa_ms_port: envVars.RVIASA_MICROSERVICE_PORT,
  rviami_ms_port: envVars.RVIAMI_MICROSERVICE_PORT,
  rviadoc_ms_port: envVars.RVIADOC_MICROSERVICE_PORT,
  
  path_projects: envVars.PATH_PROJECTS,
  rvia_environment: envVars.RVIA_ENVIRONMENT,
  rvia_path: envVars.RVIA_PATH,
};