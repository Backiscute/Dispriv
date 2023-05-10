import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class Guild extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @Column()
    Name: string;

    @ManyToOne(() => User, U => U.OwnedGuilds)
    Owner: User;
}