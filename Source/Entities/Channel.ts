/* eslint-disable no-unused-vars */
import { Entity, PrimaryColumn, Column, BaseEntity, OneToMany, ManyToOne, ManyToMany, JoinColumn, BeforeRemove } from "typeorm";
import { User } from "./User";
import { Message } from "./Message";
import { Guild, Invite } from "./Guild";
import { rmSync } from "fs";
import path from "path";
import { glob } from "glob";
import { Webhook } from "./Webhook";

export const enum ChannelType {
    GUILD_TEXT = 0,
    DM = 1,
    GUILD_VOICE = 2,
    GROUP_DM = 3,
    GUILD_CATEGORY = 4,
    GUILD_ANNOUNCEMENT = 5,
    GUILD_STORE = 6,
    GUILD_LFG = 7,
    LFG_GROUP_DM = 8,
    THREAD_ALPHA = 9,
    ANNOUNCEMENT_THREAD = 10,
    PUBLIC_THREAD = 11,
    PRIVATE_THREAD = 12,
    GUILD_STAGE_VOICE = 13,
    GUILD_DIRECTORY = 14,
    GUILD_FORUM = 15,
}

export const enum ChannelPermissionType {
    ROLE = 0,
    USER = 1,
}

export interface ChannelPermission {
    id: string; // Role ID or User ID
    type: ChannelPermissionType;
    allow: number;
    deny: number;
}

@Entity()
export class Channel extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column({ default: ChannelType.GUILD_TEXT })
        Type: ChannelType;

    @Column({ default: "A channel" })
        DisplayName: string;

    @Column({ length: 1024, nullable: true })
        Topic?: string;

    @ManyToOne(() => Guild, (G) => G.Channels, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn()
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

    @Column({ type: "simple-array", nullable: true })
        PermissionOverwrites?: ChannelPermission[];

    @ManyToOne(() => Channel, (Category) => Category.CategoryChannels, {
        nullable: true,
        orphanedRowAction: "nullify",
        onDelete: "SET NULL",
    })
    @JoinColumn()
        OwnerCategory?: Channel;

    @OneToMany(() => Channel, (C) => C.OwnerCategory, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn()
        CategoryChannels?: Channel[];

    @OneToMany(() => Webhook, (Wh) => Wh.Channel, { onDelete: "DEFAULT" })
    @JoinColumn()
        Webhooks: Webhook[];

    @ManyToMany(() => User, (U) => U.AvailableDMs, { nullable: true, orphanedRowAction: "delete", onDelete: "CASCADE" })
    @JoinColumn()
        DMRecipients?: User[];

    @OneToMany(() => Message, (M) => M.Channel, { eager: false, orphanedRowAction: "delete", onDelete: "CASCADE" })
    @JoinColumn()
        Messages: Message[];

    @OneToMany(() => Invite, (I) => I.LinkedChannel, { orphanedRowAction: "delete", onDelete: "CASCADE" })
    @JoinColumn()
        Invites: Invite[];

    @Column({ type: "simple-json", nullable: true })
        MessageAcknowledgments: { [Key: string]: string } = {};

    @Column({ nullable: true })
        FirstMessageID?: string;

    @Column({ default: 0 })
        RateLimitPerUser: number;

    @BeforeRemove()
    private DeleteAttachments() {
        const FilePaths = glob.sync(path.join(__dirname, "..", "Assets", "Attachments", `${this.ID}-*-*.*`).replace(/\\/g, "/"));

        for (const FilePath of FilePaths) rmSync(FilePath);
    }
    @BeforeRemove()
    private async DeleteInvites() {
        const Channels = await Invite.find({
            where: {
                LinkedChannel: {
                    ID: this.ID
                }
            }
        });
        await Invite.remove(Channels);
    }

    SmallDMPackage(UserContext: User) {
        return {
            id: this.ID,
            type: this.Type,
            is_spam: false,
            name: this.Type !== ChannelType.DM ? this.DisplayName : undefined,
            owner_id: this.Type === ChannelType.GROUP_DM ? this.Owner?.ID : undefined,
            last_message_id: UserContext.ID ? this.MessageAcknowledgments[UserContext.ID] ?? this.FirstMessageID : this.FirstMessageID,
            recipients: this.DMRecipients
                ? this.DMRecipients.map((R) => R.PackagePublic()).filter((R) => R.id !== UserContext.ID)
                : undefined,
            flags: 0,
        };
    }

    GatewayDMPackage(UserContext: User) {
        return {
            id: this.ID,
            type: this.Type,
            is_spam: false,
            name: this.Type !== ChannelType.DM ? this.DisplayName : undefined,
            owner_id: this.Type === ChannelType.GROUP_DM ? this.Owner?.ID : undefined,
            last_message_id: UserContext.ID ? this.MessageAcknowledgments[UserContext.ID] ?? this.FirstMessageID : this.FirstMessageID,
            recipient_ids: this.DMRecipients
                ? this.DMRecipients.map((R) => R.ID).filter((R) => R !== UserContext.ID)
                : undefined,
            flags: 0,
        };
    }

    GuildPackage(OverrideOwnerGuildID?: string, UserId?: string) {
        return {
            bitrate: this.Type === ChannelType.GUILD_VOICE ? 64000 : undefined,
            user_limit: this.Type === ChannelType.GUILD_VOICE ? this.VCUserLimit : undefined,
            video_quality_mode: this.Type === ChannelType.GUILD_VOICE ? 1 : undefined,
            rtc_region: this.Type === ChannelType.GUILD_VOICE ? "dispriv" : undefined,
            id: this.ID,
            type: this.Type,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            guild_id: OverrideOwnerGuildID ? OverrideOwnerGuildID : this.OwnerGuild!.ID,
            parent_id: this.OwnerCategory?.ID ?? null,
            position: this.GuildPosition,
            permission_overwrites: this.PermissionOverwrites ?? [],
            name: this.DisplayName,
            nsfw: this.IsNSFW,
            last_message_id: UserId ? this.MessageAcknowledgments[UserId] ?? this.FirstMessageID : this.FirstMessageID,
            flags: 0,
            topic: this.Topic ?? null,
            rate_limit_per_user: this.RateLimitPerUser
        };
    }

    get IsDM() {
        return this.Type === ChannelType.DM || this.Type === ChannelType.GROUP_DM;
    }

    AllRecipientsExceptYou(UserToAvoid: User) {
        return this.DMRecipients?.filter((R) => R.ID !== UserToAvoid.ID);
    }

    CheckDMAccess(UserData: User) {
        return this.DMRecipients
            ? this.DMRecipients.find((x) => x.ID === UserData.ID) !== undefined
            : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              false || this.Owner!.ID === UserData.ID;
    }
}