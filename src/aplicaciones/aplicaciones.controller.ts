import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AplicacionesService } from './aplicaciones.service';
import { CreateAplicacioneDto } from './dto/create-aplicacione.dto';
import { UpdateAplicacioneDto } from './dto/update-aplicacione.dto';

@Controller()
export class AplicacionesController {
  constructor(private readonly aplicacionesService: AplicacionesService) {}

  @MessagePattern('createAplicacione')
  create(@Payload() createAplicacioneDto: CreateAplicacioneDto) {
    return this.aplicacionesService.create(createAplicacioneDto);
  }

  @MessagePattern('findAllAplicaciones')
  findAll() {
    return this.aplicacionesService.findAll();
  }

  @MessagePattern('findOneAplicacione')
  findOne(@Payload() id: number) {
    return this.aplicacionesService.findOne(id);
  }

  @MessagePattern('updateAplicacione')
  update(@Payload() updateAplicacioneDto: UpdateAplicacioneDto) {
    return this.aplicacionesService.update(updateAplicacioneDto.id, updateAplicacioneDto);
  }

  @MessagePattern('removeAplicacione')
  remove(@Payload() id: number) {
    return this.aplicacionesService.remove(id);
  }
}
