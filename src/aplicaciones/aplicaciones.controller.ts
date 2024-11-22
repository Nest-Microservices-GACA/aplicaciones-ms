import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AplicacionesService } from './aplicaciones.service';
import { CreateAplicacioneDto, GetAplicacionDto, UpdateAplicacioneDto, UpdateStatusAppDto } from './dto';


// ---------------------------------------------------------------------------------------------------------------------------------------------
// TODO - Aplicaciones
// ---------------------------------------------------------------------------------------------------------------------------------------------
// VERBO    | PATH REST             | LISTO | MESSAGEPATTERN            | ACCION                                             |
// ---------------------------------------------------------------------------------------------------------------------------------------------
// @GET()   | /applications         |   ✅  | aplicaciones.findAll      | (Toma las aplicaciones del usuario que se le pasa) | 
// @PATCH() | /aplications/:id      |   ✅  | aplicaciones.updateStatus | (Actualiza el estatus de la aplicacion)            |
// @GET()   | /applications/zip/:id |   ❌  |                  | (Descarga el zip del código fuente)                |

// @POST()  | /applications/files   |   ❌  | createProyecto   | (Guarda app de zip)                                |

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

}
