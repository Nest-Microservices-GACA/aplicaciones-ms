import { Transform } from "class-transformer";
import { IsIn, IsNumber, IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class CreateAplicacionUrlDto {

    @IsString()
    @MinLength(1)
    url: string;

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

    @Transform(({ value }) => {
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          throw new Error('opc_arquitectura debe ser una cadena JSON válida');
        }
      })
    @IsObject({ message: 'opc_arquitectura debe ser un objeto' })
    opc_arquitectura:Record<string, boolean>;

}
