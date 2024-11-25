import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AplicacionesService } from './aplicaciones.service';
import { CreateAplicacionDto, GetAplicacionDto, UpdateStatusAppDto, User } from './dto';
import { fileRVIA } from './interfaces';

// ---------------------------------------------------------------------------------------------------------------------------------------------
// TODO - Aplicaciones
// ---------------------------------------------------------------------------------------------------------------------------------------------
// VERBO    | PATH REST             | LISTO | MESSAGEPATTERN            | ACCION                                             |
// ---------------------------------------------------------------------------------------------------------------------------------------------
// @GET()   | /applications         |   ✅  | aplicaciones.findAll      | (Toma las aplicaciones del usuario que se le pasa) | 
// @PATCH() | /aplications/:id      |   ✅  | aplicaciones.updateStatus | (Actualiza el estatus de la aplicacion)            |
// @POST()  | /applications/files   |   ❌  | createProyecto   | (Guarda app de zip)                                |

// @GET()   | /applications/zip/:id |   ❌  |                  | (Descarga el zip del código fuente)                |
// @POST()  | /applications/git     |   ❌  |                  | (Guarda app de GITHUB)                             |
// @POST()  | /applications/gitlab  |   ❌  |                  | (Guarda app de GITLAB)                             |


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

  @MessagePattern('aplicaciones.createApp')
  create(@Payload() data: { 
    createAplicacionDto: CreateAplicacionDto, 
    zipOr7zFile: fileRVIA, 
    pdfFile: fileRVIA, 
    user: User 
  }) {
    return this.aplicacionesService.createAppWithFiles(data.createAplicacionDto, data.zipOr7zFile, data.pdfFile, data.user);
  }

}
