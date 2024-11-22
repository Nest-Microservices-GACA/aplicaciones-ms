import { PartialType } from '@nestjs/mapped-types';
import { CreateAplicacioneDto } from './create-aplicacione.dto';

export class UpdateAplicacioneDto extends PartialType(CreateAplicacioneDto) {
  id: number;
}
