import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Aplicacion } from "./aplicacion.entity";

@Entity('tbl_escaneos')
export class Scan {
    
    @PrimaryGeneratedColumn('identity')
    idu_escaneo: number;

    @Column({type: 'varchar', length:255})
    nom_escaneo: string;

    @Column({type: 'varchar', length:20})
    nom_directorio: string;

    @ManyToOne(() => Aplicacion, application => application.scans, { nullable: false })
    @JoinColumn({ name: 'idu_aplicacion' })
    application: Aplicacion;
}
