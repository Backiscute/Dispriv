/* eslint-disable no-unused-vars */
import { Entity, BaseEntity, PrimaryColumn, ManyToOne, JoinTable, Column } from "typeorm";
import { Permissions } from "../Classes/Flags";
import { DiscordApplication } from "./Application";

export enum SlashCommandType {
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3
};

enum SlashCommandOptionType {
    SUB_COMMAND = 1,
    SUB_COMMAND_GROUP = 2,
    STRING = 3,
    INTEGER = 4,
    BOOLEAN = 5,
    USER = 6,
    CHANNEL = 7,
    ROLE = 8,
    MENTIONABLE = 9,
    NUMBER = 10
};

export interface SlashCommandOptions {
    description: string;
    name: string;
    name_localizations?: object[];
    name_localized?: string;
    description_localizations?: object[];
    description_localized?: string;
    autocomplete?: boolean;
    channel_types?: object[];
    min_value?: number;
    max_value?: number;
    min_length?: number;
    max_length?: number;
    required: boolean;
    type: SlashCommandOptionType;
    options?: SlashCommandOptions[];
    choices?: {
        name: string;
        value: string;
    }[];
}

@Entity()
export class SlashCommand extends BaseEntity {
    @PrimaryColumn()
        ID: string;

    @PrimaryColumn()
        Version: string;

    @Column()
        Name: string;

    @Column()
        Description: string;

    @Column({ default: false })
        DMPermission: boolean;
        
    @Column({ nullable: true })
        DefaultMemberPermission?: Permissions;

    @ManyToOne(() => DiscordApplication, (DA) => DA.SlashCommands, {})
    @JoinTable()
        LinkedApplication: DiscordApplication;

    @Column({ default: true })
        Global: boolean;

    @Column({ default: false })
        NSFW: boolean;

    @Column({ default: SlashCommandType.CHAT_INPUT })
        Type: SlashCommandType;

    @Column({ nullable: true })
        GuildID?: string;

    @Column({ nullable: true })
        Options?: string;

    get ParsedOptions(): SlashCommandOptions[] | undefined {
        if (this.Options) {
            return JSON.parse(this.Options) as SlashCommandOptions[];
        }
        return undefined;
    }

    Package() {
        return {
            id: this.ID,
            application_id: this.LinkedApplication.ID,
            name: this.Name,
            description: this.Description,
            dm_permission: this.DMPermission,
            default_member_permissions: this.DefaultMemberPermission,
            nsfw: this.NSFW,
            type: this.Type,
            version: this.Version,
            guild_id: this.GuildID,
            options: this.ParsedOptions
        };
    }
}