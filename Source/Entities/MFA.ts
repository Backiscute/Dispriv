import { BaseEntity, BeforeInsert, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { GenerateRandomString } from "../Modules/DiscordUtils";
import { User } from "./User";

@Entity()
export class MFABackup extends BaseEntity {
    @PrimaryGeneratedColumn()
        ID: string;

    @ManyToOne(() => User, U => U.CreatedWebhooks, { onDelete: "CASCADE", eager: true })
        LinkedUser: User;

    @Column({ default: false })
        Consumed: boolean;

    @Column()
        BackupCode: string;

    @BeforeInsert()
    private SetDefaults() {
        this.BackupCode = GenerateRandomString(8).toLowerCase();
    }

    Package() {
        return {
            code: this.BackupCode,
            consumed: this.Consumed,
            user_id: this.LinkedUser.ID
        };
    }
}