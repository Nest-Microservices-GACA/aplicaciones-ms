import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AplicacionesService } from './aplicaciones.service';
import { CreateAplicacionDto, CreateAplicacionUrlDto, GetAplicacionDto, UpdateStatusAppDto, User } from './dto';
import { fileRVIA } from './interfaces';

// ---------------------------------------------------------------------------------------------------------------------------------------------
// TODO - Aplicaciones
// ---------------------------------------------------------------------------------------------------------------------------------------------
// VERBO    | PATH REST                    | LISTO | MESSAGEPATTERN               | ACCION                                             |
// -------------------------------------   ------------------------------------------------------------------------------------------------------
// @GET()   | /applications                |   ✅  | aplicaciones.findAll         | (Toma las aplicaciones del usuario que se le pasa) | 
// @PATCH() | /aplications/:id             |   ✅  | aplicaciones.updateStatus    | (Actualiza el estatus de la aplicacion)            |
// @POST()  | /applications/new-app        |   ❌  | aplicaciones.createAppZip    | (Guarda app de zip)                                |
// @POST()  | /applications/new-app-git    |   ❌  | aplicaciones.createAppGit    | (Guarda app de GITHUB)                             |
// @POST()  | /applications/new-app-gitlab |   ❌  | aplicaciones.createAppGitLab | (Guarda app de GITLAB)                             |

// @GET()   | /applications/zip/:id        |   ❌  |                  | (Descarga el zip del código fuente)                |


@Controller()
export class AplicacionesController {
  constructor(private readonly aplicacionesService: AplicacionesService) {}

  @MessagePattern('aplicaciones.findAll')
  findAll(@Payload() getAplicacionDto: GetAplicacionDto) {
    return this.aplicacionesService.findAll(getAplicacionDto.user);
  }

  @MessagePattern('aplicaciones.updateStatus')
  findOne(@Payload() updateStatus: UpdateStatusAppDto) {
    return this.aplicacionesService.updateStatusApp(updateStatus.id, updateStatus.estatusId);
  }

  @MessagePattern('aplicaciones.createAppZip')
  createAppZip(@Payload() data: { 
    createAplicacionDto: CreateAplicacionDto, 
    zipOr7zFile: fileRVIA, 
    pdfFile: fileRVIA, 
    user: User 
  }) {
    return this.aplicacionesService.createAppWithFiles(data.createAplicacionDto, data.zipOr7zFile, data.pdfFile, data.user);
  }

  @MessagePattern('aplicaciones.createAppGitHub')
  createAppGit(@Payload() data: { 
    createAplicacionDto: CreateAplicacionUrlDto, 
    user: User, 
    pdfFile: fileRVIA | null, 
  }) {
    return this.aplicacionesService.createAppWithGit(data.createAplicacionDto, data.user, data.pdfFile);
  }

  @MessagePattern('aplicaciones.createAppGitLab')
  createAppGitLab(@Payload() data: { 
    createAplicacionDto: CreateAplicacionUrlDto, 
    user: User, 
    pdfFile: fileRVIA | null, 
  }) {
    return this.aplicacionesService.createAppWithGitLab(data.createAplicacionDto, data.user, data.pdfFile);
  }

}
