import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne, OneToMany } from "typeorm";
import { User } from "./User";

@Entity()
export class Message extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @OneToMany(() => User, U => U.MessagesByUser)
    Author: User;

    @Column()
    Content: string;

    @Column()
    CreationDate: Date;

    @ManyToOne(() => Reaction, R => R.ToMessage)
    Reactions: Reaction[];
}

@Entity()
export class Reaction extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @Column()
    EmojiCode: string;

    @OneToMany(() => Message, M => M.Reactions)
    ToMessage: Message;

    @Column({ default: "normal" })
    Type: "normal" | "super";
}