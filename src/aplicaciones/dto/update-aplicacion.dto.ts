import { PartialType } from '@nestjs/mapped-types';
import { CreateAplicacioneDto } from './create-aplicacion.dto';

export class UpdateAplicacioneDto extends PartialType(CreateAplicacioneDto) {
  id: number;
}
