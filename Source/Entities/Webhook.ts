import { BaseEntity, BeforeInsert, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Channel } from "./Channel";
import { GenerateRandomString } from "../Modules/DiscordUtils";
import { User } from "./User";

@Entity()
export class Webhook extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @ManyToOne(() => Channel, Ch => Ch.Webhooks, { onDelete: "CASCADE" })
        Channel: Channel;

    @ManyToOne(() => User, U => U.CreatedWebhooks, { onDelete: "CASCADE", eager: true })
        CreatedBy: User;

    @Column()
        Name: string;

    @Column({ nullable: true })
        IconID: string;

    @Column()
        Token: string;

    @BeforeInsert()
    private SetDefaults() {
        this.ID = GenerateSnowflake();
        this.Token = GenerateRandomString(48);
    }

    Package(ChannelOverride?: Channel) {
        if (!ChannelOverride)
            ChannelOverride = this.Channel;

        return {
            id: this.ID,
            type: 1, // no support for other yet
            guild_id: ChannelOverride?.OwnerGuild?.ID ?? undefined,
            channel_id: ChannelOverride?.ID ?? null,
            user: this.CreatedBy ? this.CreatedBy.Partial() : undefined,
            name: this.Name,
            avatar: this.IconID,
            token: this.Token,
            // application_id: (only used for bots and slash commands)
            // source_guild: partial Guild for following channels
            // source_channel: partial Channel for following channels
            url: `http://127.0.0.1:${process.env.PORT}/webhooks/${ChannelOverride.ID}${this.Token}` // TODO: make it detect what ip it's being hosted on
        };
    }
}