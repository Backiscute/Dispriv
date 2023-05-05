/* eslint-disable */
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
        length: 32,
    })
    username: string
} // TODO: Add more properties from https://discord.com/developers/docs/resources/user