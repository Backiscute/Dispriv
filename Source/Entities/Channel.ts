import { Entity, PrimaryColumn, Column, BaseEntity, OneToMany, ManyToOne, ManyToMany } from "typeorm";
import { User } from "./User";
import { Message } from "./Message";
import { Msg } from "../Modules/Logger";
import { Guild } from "./Guild";

export const enum ChannelType {
    GUILD_TEXT = 0,
    DM = 1,
    GUILD_VOICE = 2,
    GROUP_DM = 3,
    GUILD_CATEGORY = 4,
    GUILD_ANNOUNCEMENT = 5,
    UNKNOWN1 = 6,
    UNKNOWN2 = 7,
    UNKNOWN3 = 8,
    UNKNOWN4 = 9,
    ANNOUNCEMENT_THREAD = 10,
    PUBLIC_THREAD = 11,
    PRIVATE_THREAD = 12,
    GUILD_STAGE_VOICE = 13,
    GUILD_DIRECTORY = 14,
    GUILD_FORUM = 15
}

@Entity()
export class Channel extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @Column({ default: ChannelType.GUILD_TEXT })
    Type: ChannelType;

    @Column({ default: "A channel" })
    DisplayName: string;

    @ManyToOne(() => Guild, G => G.Channels, { eager: true, nullable: true })
    OwnerGuild?: Guild;

    @Column({ default: -1 })
    GuildPosition: number;
    
    // TODO: permissions

    @Column({ default: false })
    IsNSFW: boolean;

    @Column({ nullable: true })
    VCUserLimit?: number;

    @Column({ default: 0 })
    Timeout: number;

    @Column({ nullable: true })
    GroupDMIconHash?: string;

    @Column({ type: "simple-json", nullable: true })
    Owner?: User;

    @ManyToOne(() => Channel, Category => Category.CategoryChannels, { nullable: true })
    OwnerCategory?: Channel;

    @OneToMany(() => Channel, C => C.OwnerCategory, { nullable: true })
    CategoryChannels?: Channel[];

    @ManyToMany(() => User, U => U.AvailableDMs, { nullable: true })
    DMRecipients?: User[];

    @OneToMany(() => Message, M => M.Channel, { orphanedRowAction: "delete" })
    Messages: Message[];

    SmallDMPackage(UserContext: User) {
        return {
            id: this.ID,
            type: this.Type,
            is_spam: false,
            name: this.Type !== ChannelType.DM ? this.DisplayName : undefined,
            owner_id: this.Type === ChannelType.GROUP_DM ? this.Owner?.ID : undefined,
            last_message_id: this.Messages ? this.Messages.length >= 1 ? this.Messages[0].ID : null : null,
            recipients: this.DMRecipients ? this.DMRecipients.map(R => R.PackagePublic()).filter(R => R.id !== UserContext.ID) : undefined,
            flags: 0
        };
    }

    GatewayDMPackage(UserContext: User) {
        return {
            id: this.ID,
            type: this.Type,
            is_spam: false,
            name: this.Type !== ChannelType.DM ? this.DisplayName : undefined,
            owner_id: this.Type === ChannelType.GROUP_DM ? this.Owner?.ID : undefined,
            last_message_id: this.Messages ? this.Messages.length >= 1 ? this.Messages[0].ID : null : null,
            recipient_ids: this.DMRecipients ? this.DMRecipients.map(R => R.ID).filter(R => R !== UserContext.ID) : undefined,
            flags: 0
        };
    }

    IsDM() {
        return this.Type === ChannelType.DM || this.Type === ChannelType.GROUP_DM;
    }

    AllRecipientsExceptYou(UserToAvoid: User) {
        return this.DMRecipients?.filter(R => R.ID !== UserToAvoid.ID);
    }

    CheckDMAccess(UserData: User) {
        return this.DMRecipients ? this.DMRecipients.find(x => x.ID === UserData.ID) !== undefined : false || this.Owner.ID === UserData.ID;
    }
}