import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { User } from './user.dto';

export class GetAplicacionDto {
    @ValidateNested()
    @Type(() => User)
    user: User;
}