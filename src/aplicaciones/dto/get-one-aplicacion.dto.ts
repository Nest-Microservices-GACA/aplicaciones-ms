import { IsNumber } from "class-validator";

export class GetOneAplicacionDto {
    @IsNumber()
    idu_proyecto: number;
}