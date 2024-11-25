import { Transform } from "class-transformer";
import { IsIn, IsNumber, IsObject, IsOptional } from "class-validator";

export class CreateAplicacionDto {
    @IsNumber()
    @Transform(({ value }) => parseInt(value, 10))
    @IsIn([0,1, 2, 3], {
        message: 'El valor de num_accion debe ser 0, 1, 2 o 3',
    })
    num_accion: number;

    @IsNumber()
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    opc_lenguaje: number = 0;

    @IsOptional()
    @Transform(({ value }) => {
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          throw new Error('opc_arquitectura debe ser una cadena JSON válida');
        }
      })
      @IsObject({ message: 'opc_arquitectura debe ser un objeto' })
    opc_arquitectura:Record<string, boolean>;
    
    @IsOptional()
    fec_creacion?: Date;
  
    @IsOptional()
    fec_actualizacion?: Date; 

}
