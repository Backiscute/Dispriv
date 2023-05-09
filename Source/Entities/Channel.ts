import { Entity, PrimaryColumn, Column, BaseEntity, OneToMany, ManyToOne } from "typeorm";
import { User } from "./User";
import { Message } from "./Message";

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

    //@ManyToOne(() => Guild, G => G.Channels, { eager: true, nullable: true })
    //OwnerGuild?: Guild

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

    @ManyToOne(() => Channel, Category => Category.CategoryChannels)
    OwnerCategory: Channel;

    @OneToMany(() => Channel, C => C.OwnerCategory, { nullable: true })
    CategoryChannels?: Channel[];

    @Column({ type: "simple-json", nullable: true })
    DMRecipients?: User[];

    @OneToMany(() => Message, M => M.Channel)
    Messages: Message[];

    SmallDMPackage() {
        return {
            id: this.ID,
            type: this.Type,
            last_message_id: this.Messages ? this.Messages.length >= 1 ? this.Messages[0].ID : null : null,
            recipients: this.DMRecipients ? this.DMRecipients.map(R => R.PackagePublic()) : undefined,
            flags: 0
        };
    }

    CheckDMAccess(UserData: User) {
        return this.DMRecipients ? this.DMRecipients.find(x => x.ID === UserData.ID) || this.Owner.ID === UserData.ID : false;
    }
}