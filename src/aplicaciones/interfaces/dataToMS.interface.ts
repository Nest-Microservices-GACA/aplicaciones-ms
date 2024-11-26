import { NumberAction } from "./numberAction.enum";

export interface DataToMS{ 
    idu_proyecto: number ,
    num_accion: 0 | NumberAction ,
    numero_empleado: number,
    path_project: string
}