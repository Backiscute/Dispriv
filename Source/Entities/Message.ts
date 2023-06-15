import { Entity, PrimaryColumn, Column, BaseEntity, ManyToOne, OneToMany } from "typeorm";
import { User } from "./User";
import { Channel } from "./Channel";
import { CreateTimestamp } from "../Modules/DiscordUtils";
import { MessageFlags } from "../Classes/Flags";

export const enum MessageType {
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
    //GUILD_STREAM = 13, // removed due to not being used
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
    GUILD_APPLICATION_PREMIUM_SUBSCRIPTION = 32
}

@Entity()
export class Message extends BaseEntity {
    @PrimaryColumn()
    ID: string;

    @ManyToOne(() => User, U => U.MessagesByUser, { eager: true })
    Author: User;

    @Column({ default: MessageType.DEFAULT })
    Type: MessageType;

    @Column({ default: 0 })
    Flags: MessageFlags;

    @Column()
    Content: string;

    @Column()
    CreationDate: Date;

    @OneToMany(() => Reaction, R => R.ToMessage, { eager: true })
    Reactions: Reaction[];

    @OneToMany(() => Message, M => M.ReplyingTo)
    Replies: Message[];

    @ManyToOne(() => Message, M => M.Replies, { nullable: true, eager: true })
    ReplyingTo?: Message;

    @ManyToOne(() => Channel, C => C.Messages, { orphanedRowAction: "delete" })
    Channel: Channel;

    Package() {
        return {
            message_reference: this.Type === MessageType.REPLY ? {
                channel_id: this.ReplyingTo?.Channel?.ID,
                message_id: this.ReplyingTo?.ID
            } : undefined,
            referenced_message: this.Type === MessageType.REPLY ? this.ReplyingTo?.Package() : undefined,
            reactions: this.Reactions?.map(R => R.Package()),
            attachments: [],
            tts: false,
            embeds: [], // TODO: Embeds
            timestamp: CreateTimestamp(this.CreationDate),
            mention_everyone: this.Content.includes("@everyone"),
            id: this.ID,
            pinned: false/*Channel.PinnedMessages.includes(this)*/,
            edited_timestamp: null,
            author: this.Author.PackagePublic(),
            mention_roles: [],
            content: this.Content,
            channel_id: this.Channel.ID,
            mentions: [],
            type: this.Type,
            flags: this.Flags
        };
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

    @ManyToOne(() => Message, M => M.Reactions)
    ToMessage: Message;

    @Column({ default: "normal" })
    Type: "normal" | "super";

    Package(Context?: User) {
        return {
            count: this.UsersReacted ? this.UsersReacted.length : 1,
            me: this.UsersReacted ? this.UsersReacted.includes(Context) : false,
            emoji: {
                id: null,
                name: this.EmojiCode
            }
        };
    }
}