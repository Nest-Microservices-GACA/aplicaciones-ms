import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AplicacionesService } from './aplicaciones.service';
import { CreateAplicacionDto, CreateAplicacionUrlDto, GetAplicacionesDto, GetOneAplicacionDto, UpdateStatusAppDto, User } from './dto';
import { fileRVIA } from './interfaces';
import { createReadStream } from 'fs';

// ---------------------------------------------------------------------------------------------------------------------------------------------
// TODO - Aplicaciones
// ---------------------------------------------------------------------------------------------------------------------------------------------
// VERBO    | PATH REST                    | LISTO | MESSAGEPATTERN               | ACCION                                             |
// -------------------------------------   ------------------------------------------------------------------------------------------------------
// @GET()   | /applications                |   ✅  | aplicaciones.findAll         | (Toma las aplicaciones del usuario que se le pasa) | 
// @PATCH() | /aplications/:id             |   ✅  | aplicaciones.updateStatus    | (Actualiza el estatus de la aplicacion)            |
// @POST()  | /applications/new-app        |   ✅  | aplicaciones.createAppZip    | (Guarda app de zip)                                |
// @POST()  | /applications/new-app-git    |   ✅  | aplicaciones.createAppGitHub | (Guarda app de GITHUB)                             |
// @POST()  | /applications/new-app-gitlab |   ✅  | aplicaciones.createAppGitLab | (Guarda app de GITLAB)                             |

// @GET()   | /applications/zip/:id        |   ❌  |                  | (Descarga el zip del código fuente)                |


@Controller()
export class AplicacionesController {
  constructor(private readonly aplicacionesService: AplicacionesService) {}

  @MessagePattern('aplicaciones.findAll')
  findAll(@Payload() getAplicacionDto: GetAplicacionesDto) {
    return this.aplicacionesService.findAll(getAplicacionDto.user);
  }

  @MessagePattern('aplicaciones.findOne')
  findOne(@Payload() getAplicacionDto: GetOneAplicacionDto) {
    return this.aplicacionesService.findOne(getAplicacionDto.idu_proyecto);
  }

  @MessagePattern('aplicaciones.updateStatus')
  updateStatusApp(@Payload() updateStatus: UpdateStatusAppDto) {
    return this.aplicacionesService.updateStatusApp(updateStatus.id, updateStatus.estatusId);
  }

  @MessagePattern('aplicaciones.createAppZip')
  createAppZip(@Payload() data: { 
    createAplicacionDto: CreateAplicacionDto, 
    appName: string, 
    zipName: string, 
    fileType: string,
    pdfName: string | null, 
    user: User 
  }) {
    return this.aplicacionesService.createAppWithFiles(data.createAplicacionDto, data.appName, data.zipName, data.pdfName, data.fileType, data.user);
  }

  @MessagePattern('aplicaciones.createAppGitHub')
  createAppGit(@Payload() data: { 
    createAplicacionDto: CreateAplicacionUrlDto, 
    user: User, 
    pdfName: string | null, 
  }) {
    return this.aplicacionesService.createAppWithGit(data.createAplicacionDto, data.user, data.pdfName);
  }

  @MessagePattern('aplicaciones.createAppGitLab')
  createAppGitLab(@Payload() data: { 
    createAplicacionDto: CreateAplicacionUrlDto, 
    user: User, 
    pdfName: string | null, 
  }) {
    return this.aplicacionesService.createAppWithGitLab(data.createAplicacionDto, data.user, data.pdfName);
  }


  @MessagePattern('aplicaciones.download7z')
  downloadApp(@Payload() getAplicacionDto: GetOneAplicacionDto) {
    return this.aplicacionesService.downloadFile7z(getAplicacionDto.idu_proyecto);
  }

}
