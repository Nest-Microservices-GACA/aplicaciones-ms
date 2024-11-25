import { PartialType } from '@nestjs/mapped-types';
import { CreateAplicacionDto } from './create-aplicacion.dto';

export class UpdateAplicacioneDto extends PartialType(CreateAplicacionDto) {
  id: number;
}
