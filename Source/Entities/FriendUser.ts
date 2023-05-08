import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne } from "typeorm";
import { User } from "./User";
import { CreateTimestamp } from "../Modules/DiscordUtils";

export const enum RelationType {
    FRIEND = 1,
    BLOCKED = 2,
    NOT_YET_ACCEPTED = 5,

    INTERNAL_INCOMING = 3,
    INTERNAL_OUTGOING = 4
}

@Entity()
export class Relation extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @ManyToOne(() => User, RelationOwner => RelationOwner.Relations, { eager: true })
    From: User;

    @ManyToOne(() => User, RelationRegarder => RelationRegarder.Relations, { eager: true })
    Regarding: User;

    @Column({ default: RelationType.FRIEND })
    Type: RelationType;

    @Column({ nullable: true })
    Nickname?: string;

    Package(IncludeUserData: boolean, Context: User) {
        let TypeDecided = RelationType.INTERNAL_INCOMING;
        if (this.Type === RelationType.NOT_YET_ACCEPTED)
            if (Context.ID === this.From.ID)
                TypeDecided = RelationType.INTERNAL_OUTGOING;
            else
                TypeDecided = RelationType.INTERNAL_INCOMING;

        let UserDecided = this.Regarding;
        if (Context.ID === this.Regarding.ID)
            UserDecided = this.From;
        
        return {
            id: UserDecided.ID,
            nickname: this.Nickname,
            should_notify: true,
            type: TypeDecided,
            user: IncludeUserData ? UserDecided.PackagePublic() : undefined,
            user_id: !IncludeUserData ? UserDecided.ID : undefined,
            since: CreateTimestamp()
        };
    }

    Package2(IncludeUserData: boolean, Context: User) { // for endpoints, package should be used for gateway
        let TypeDecided = RelationType.INTERNAL_INCOMING;
        if (this.Type === RelationType.NOT_YET_ACCEPTED)
            if (Context.ID === this.From.ID)
                TypeDecided = RelationType.INTERNAL_OUTGOING;
            else
                TypeDecided = RelationType.INTERNAL_INCOMING;

        let UserDecided = this.Regarding;
        if (Context.ID === this.Regarding.ID)
            UserDecided = this.From;
        
        return {
            id: UserDecided.ID,
            nickname: this.Nickname,
            type: TypeDecided,
            user: IncludeUserData ? UserDecided.PackagePublic() : undefined
        };
    }
}