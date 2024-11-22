import { IsNumber } from "class-validator";

export class UpdateStatusAppDto {
    @IsNumber()
    id: number;
    
    @IsNumber()
    estatusId: number;
}