import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsString, ValidateNested } from "class-validator";

export class Position {
    @IsNumber()
    idu_rol: number;
  
    @IsString()
    nom_rol: string;
  }
  
export class User {
    @IsNumber()
    idu_usuario: number;
  
    @IsNumber()
    numero_empleado: number;
  
    @IsString()
    nom_correo: string;
  
    @IsString()
    nom_usuario: string;
  
    @IsBoolean()
    esactivo: boolean;
  
    @ValidateNested()
    @Type(() => Position)
    position: Position;
}