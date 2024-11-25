import 'dotenv/config';

import * as joi from 'joi';

interface EnvVars {
  DB_HOST: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_PORT: number;

  APP_MS_PORT: number;
  UPDATE_MS_PORT: number;
  UPDATE_MS_HOST:string;

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
  UPDATE_MS_PORT: joi.number().required(),
  UPDATE_MS_HOST: joi.string().required(),

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
  update_ms_port: envVars.UPDATE_MS_PORT,
  update_ms_host: envVars.UPDATE_MS_HOST,
  
  path_projects: envVars.PATH_PROJECTS,
  rvia_environment: envVars.RVIA_ENVIRONMENT,
  rvia_path: envVars.RVIA_PATH,
};