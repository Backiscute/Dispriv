import { Entity, PrimaryColumn, Column, BaseEntity } from "typeorm";

export const enum FriendType {
    FRIEND = 1,
    BLOCKED = 2,
    INCOMING = 3,
    OUTGOING = 4
}

@Entity()
export class FriendUser extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @Column({ default: FriendType.FRIEND })
    Type: FriendType;

    @Column({ nullable: true })
    nickname?: string;

    Package() {
        return {
            id: this.ID,
            nickname: this.nickname,
            type: this.Type,
            user_id: this.ID
        };
    }
}