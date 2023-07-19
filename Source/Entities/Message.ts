/* eslint-disable no-unused-vars */
import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne, OneToMany, BeforeRemove } from "typeorm";
import { User } from "./User";
import { Channel } from "./Channel";
import { CreateTimestamp } from "../Modules/DiscordUtils";
import { MessageFlags } from "../Classes/Flags";
import { glob } from "glob";
import path from "path";
import { rmSync } from "fs";

export enum MessageType {
    DEFAULT = 0,
    RECIPIENT_ADD = 1,
    RECIPIENT_REMOVE = 2,
    CALL = 3,
    CHANNEL_NAME_CHANGE = 4,
    CHANNEL_ICON_CHANGE = 5,
    CHANNEL_PINNED_MESSAGE = 6,
    USER_JOIN = 7,
    GUILD_BOOST = 8,
    GUILD_BOOST_TIER_1 = 9,
    GUILD_BOOST_TIER_2 = 10,
    GUILD_BOOST_TIER_3 = 11,
    CHANNEL_FOLLOW_ADD = 12,
    GUILD_STREAM = 13, // re-added because idc
    GUILD_DISCOVERY_DISQUALIFIED = 14,
    GUILD_DISCOVERY_REQUALIFIED = 15,
    GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING = 16,
    GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING = 17,
    THREAD_CREATED = 18,
    REPLY = 19,
    CHAT_INPUT_COMMAND = 20,
    THREAD_STARTER_MESSAGE = 21,
    GUILD_INVITE_REMINDER = 22,
    CONTEXT_MENU_COMMAND = 23,
    AUTO_MODERATION_ACTION = 24,
    ROLE_SUBSCRIPTION_PURCHASE = 25,
    INTERACTION_PREMIUM_UPSELL = 26,
    STAGE_START = 27,
    STAGE_END = 28,
    STAGE_SPEAKER = 29,
    STAGE_RAISE_HAND = 30,
    STAGE_TOPIC = 31,
    GUILD_APPLICATION_PREMIUM_SUBSCRIPTION = 32,
    NITRO_TRIAL_REFERRAL = 33,
    AUTO_MODERATION_RAID = 36,
    AUTO_MODERATION_FALSE_ALARM = 37,
    AUTO_MODERATION_LOCKED = 38,
    AUTO_MODERATION_UNLOCKED = 39,
}

export enum EmbedType {
    rich = "rich",
    image = "image",
    video = "video",
    gifv = "gifv",
    article = "article",
    link = "link",
}

export interface EmbedImage {
    url?: string;
    proxy_url?: string;
    height?: number;
    width?: number;
}

export interface Embed {
    title?: string;
    type?: EmbedType;
    description?: string;
    url?: string;
    timestamp?: Date;
    color?: number;
    footer?: {
        text: string;
        icon_url?: string;
        proxy_icon_url?: string;
    };
    image?: EmbedImage;
    thumbnail?: EmbedImage;
    video?: EmbedImage;
    provider?: {
        name?: string;
        url?: string;
    };
    author?: {
        name?: string;
        url?: string;
        icon_url?: string;
        proxy_icon_url?: string;
    };
    fields?: {
        name: string;
        value: string;
        inline?: boolean;
    }[];
}

export interface Attachment {
    id: string;
    filename: string;
    size: number;
    url: string;
    proxy_url: string;
    width?: number;
    height?: number;
    content_type: string;
}

@Entity()
export class Message extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column({ type: "simple-json", nullable: true })
        Attachments: Attachment[] = [];

    @ManyToOne(() => User, (U) => U.MessagesByUser, { eager: true })
        Author: User;

    @Column({ default: MessageType.DEFAULT })
        Type: MessageType;

    @Column({ default: 0 })
        Flags: MessageFlags;

    @Column()
        Content: string;

    @Column({ default: false })
        Pinned: boolean;

    @Column()
        CreationDate: Date;

    @Column({ nullable: true })
        EditedTimestamp?: Date;

    @Column({ type: "simple-json", nullable: true })
        Embeds: Embed[] = [];

    @OneToMany(() => Reaction, (R) => R.ToMessage, { eager: true })
        Reactions: Reaction[];

    @OneToMany(() => Message, (M) => M.ReplyingTo)
        Replies: Message[];

    @ManyToOne(() => Message, (M) => M.Replies, {
        nullable: true /*, eager: true*/,
        onDelete: "SET NULL",
        orphanedRowAction: "nullify",
    })
        ReplyingTo?: Message;

    @ManyToOne(() => Channel, (C) => C.Messages, { onDelete: "CASCADE", orphanedRowAction: "delete" })
        Channel: Channel;

    Package(
        CurrentUser: User,
        IncludeReplyData = true,
    ): {
        message_reference?: {
            channel_id: string | undefined;
            message_id: string | undefined;
        };
        referenced_message: ReturnType<typeof Message.prototype.Package> | undefined;
        reactions: ReturnType<typeof Reaction.prototype.Package>[];
        attachments: Attachment[];
        tts: boolean;
        embeds: Embed[];
        timestamp: string;
        mention_everyone: boolean;
        id: string;
        pinned: boolean;
        edited_timestamp: string | null;
        author: ReturnType<typeof User.prototype.PackagePublic>;
        mention_roles: [];
        content: string;
        channel_id: string;
        mentions: [];
        type: MessageType;
        flags: MessageFlags;
    } {
        return {
            message_reference:
                (this.Type === MessageType.REPLY || this.Type === MessageType.CHANNEL_PINNED_MESSAGE) &&
                IncludeReplyData
                    ? {
                        channel_id: this.ReplyingTo?.Channel?.ID,
                        message_id: this.ReplyingTo?.ID,
                    }
                    : undefined,
            referenced_message:
                (this.Type === MessageType.REPLY || this.Type === MessageType.CHANNEL_PINNED_MESSAGE) &&
                IncludeReplyData
                    ? this.ReplyingTo?.Package(CurrentUser, false)
                    : undefined,
            reactions: this.Reactions?.map((R) => R.Package(CurrentUser)) || [],
            attachments: this.Attachments,
            tts: false,
            embeds: this.Embeds,
            timestamp: CreateTimestamp(this.CreationDate),
            mention_everyone: this.Content.includes("@everyone"),
            id: this.ID,
            pinned: this.Pinned,
            edited_timestamp: this.EditedTimestamp ? CreateTimestamp(this.EditedTimestamp) : null,
            author: this.Author.PackagePublic(),
            mention_roles: [],
            content: this.Content,
            channel_id: this.Channel.ID,
            mentions: [],
            type: this.Type,
            flags: this.Flags,
        };
    }

    @BeforeRemove()
    private DeleteAttachments() {
        for (const Attachment of this.Attachments) {
            const FilePaths = glob.sync(
                path
                    .join(
                        __dirname,
                        "..",
                        "Assets",
                        "Attachments",
                        `${this.Channel.ID}-${Attachment.id}-${
                            Attachment.filename.replace(/(\\|\?|\*|\*\*|\[|\]|!|\(|\))/g, "\\$&").split(".")[0]
                        }.*`,
                    )
                    .replace(/\\/g, "/"),
            );
            for (const FilePath of FilePaths) rmSync(FilePath);
        }
    }
}

@Entity()
export class Reaction extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @Column()
        EmojiCode: string;

    @Column({ type: "simple-json" })
        UsersReacted: User[];

    @ManyToOne(() => Message, (M) => M.Reactions)
        ToMessage: Message;

    @Column({ default: "normal" })
        Type: "normal" | "super";

    Package(Context?: User) {
        return {
            count: this.Type === "normal" ? (this.UsersReacted ? this.UsersReacted.length : 1) : undefined,
            burst_count: this.Type === "super" ? (this.UsersReacted ? this.UsersReacted.length : 1) : undefined,
            burst_me:
                this.Type === "super"
                    ? this.UsersReacted
                        ? this.UsersReacted.find((u) => u.ID === Context?.ID)
                        : false
                    : undefined,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            me:
                this.Type === "normal"
                    ? this.UsersReacted
                        ? this.UsersReacted.find((u) => u.ID === Context?.ID)
                        : false
                    : undefined,
            emoji: {
                id: null,
                name: this.EmojiCode,
            },
        };
    }
}
