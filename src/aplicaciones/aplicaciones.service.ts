import { Injectable } from '@nestjs/common';
import { CreateAplicacioneDto } from './dto/create-aplicacione.dto';
import { UpdateAplicacioneDto } from './dto/update-aplicacione.dto';

@Injectable()
export class AplicacionesService {
  create(createAplicacioneDto: CreateAplicacioneDto) {
    return 'This action adds a new aplicacione';
  }

  findAll() {
    return `This action returns all aplicaciones`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aplicacione`;
  }

  update(id: number, updateAplicacioneDto: UpdateAplicacioneDto) {
    return `This action updates a #${id} aplicacione`;
  }

  remove(id: number) {
    return `This action removes a #${id} aplicacione`;
  }
}
