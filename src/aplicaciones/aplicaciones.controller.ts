import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { AplicacionesService } from './aplicaciones.service';
import { CreateAplicacioneDto, GetAplicacionDto, UpdateAplicacioneDto } from './dto';


// ---------------------------------------------------------------------------------------------------------------------------------------------
// TODO - Aplicaciones
// ---------------------------------------------------------------------------------------------------------------------------------------------
// VERBO    | PATH REST             | LISTO       | MESSAGEPATTERN       | ACCION                                             |
// ---------------------------------------------------------------------------------------------------------------------------------------------
// @GET()   | /applications         |   ✅        | aplicaciones.findAll | (Toma las aplicaciones del usuario que se le pasa) | 
// @PATCH() | /aplications/:id      |   ❌        |                  | (Actualiza el estado de la aplicacion)             |
// @GET()   | /applications/zip/:id |   ❌        |                  | (Descarga el zip del código fuente)                |

// @POST()  | /applications/files   |   ❌        | createProyecto   | (Guarda app de zip)                                |

// @POST()  | /applications/git     |   ❌        |                  | (Guarda app de GITHUB)                             |
// @POST()  | /applications/gitlab  |   ❌        |                  | (Guarda app de GITLAB)                             |


@Controller()
export class AplicacionesController {
  constructor(private readonly aplicacionesService: AplicacionesService) {}

  // @MessagePattern('createAplicacione')
  // create(@Payload() createAplicacioneDto: CreateAplicacioneDto) {
  //   return this.aplicacionesService.create(createAplicacioneDto);
  // }

  @MessagePattern('aplicaciones.findAll')
  findAll(@Payload() getAplicacionDto: GetAplicacionDto) {
    return this.aplicacionesService.findAll(getAplicacionDto.user);
  }

  // @MessagePattern('findOneAplicacione')
  // findOne(@Payload() id: number) {
  //   return this.aplicacionesService.findOne(id);
  // }

  // @MessagePattern('updateAplicacione')
  // update(@Payload() updateAplicacioneDto: UpdateAplicacioneDto) {
  //   return this.aplicacionesService.update(updateAplicacioneDto.id, updateAplicacioneDto);
  // }

  // @MessagePattern('removeAplicacione')
  // remove(@Payload() id: number) {
  //   return this.aplicacionesService.remove(id);
  // }
}
