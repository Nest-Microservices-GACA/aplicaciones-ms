import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Aplicacion } from "./aplicacion.entity";

@Entity('tbl_checkmarx')
export class Checkmarx {

    @PrimaryGeneratedColumn('identity')
    idu_checkmarx: number;

    @Column({type: 'varchar', length:255})
    nom_checkmarx: string;

    @Column({type: 'varchar', length:255})
    nom_directorio: string;

    @ManyToOne(() => Aplicacion, application => application.scans, { nullable: false })
    @JoinColumn({ name: 'idu_aplicacion' })
    application: Aplicacion;

}
