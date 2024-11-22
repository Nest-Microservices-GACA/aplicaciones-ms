import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Aplicacion } from "./aplicacion.entity";


@Entity('tcl_estatusaplicaciones')
export class Aplicacionstatus {

    @PrimaryGeneratedColumn('identity')
    idu_estatus_aplicacion: number;

    @Column({type: 'varchar', length:20})
    des_estatus_aplicacion  : string;

    @OneToMany(
        () => Aplicacion, application => application.applicationstatus,
    )
    application: Aplicacion[]
}
