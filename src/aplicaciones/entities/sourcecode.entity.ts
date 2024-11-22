import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Aplicacion } from "./aplicacion.entity";

@Entity('tbl_codigo_fuentes')
export class Sourcecode {

    @PrimaryGeneratedColumn('identity')
    idu_codigo_fuente: number;

    @Column({type: 'varchar', length:255})
    nom_codigo_fuente: string;

    @Column({type: 'varchar', length:20})
    nom_directorio: string;

    @OneToMany(
        () => Aplicacion, application => application.applicationstatus,
    )
    application: Aplicacion[]

}
