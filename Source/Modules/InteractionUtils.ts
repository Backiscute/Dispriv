/* eslint-disable no-unused-vars */
import { SlashCommandType } from "../Entities/SlashCommand";

export enum InteractionType
{
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3
}

export interface InteractionData
{
    id: string;
    name: string;
    type: SlashCommandType;
    resolved?: object; // TODO
    options?: object[]; // TODO
    custom_id?: string;
    component_type?: number;
    values?: string[];
    target_id?: string;
} // https://discord-userdoccers.vercel.app/interactions/receiving-and-responding#interaction-data-structure

export interface Interaction
{
    id: string;
    application_id: string;
    type: InteractionType;
    data?: InteractionData; // This is always present on application command and message component interaction types. It is optional for future-proofing against new interaction types.
    guild_id?: string;
    channel_id?: string;
    member?: object; // membership, member is sent when the interaction is invoked in a guild, and user is sent when invoked in a DM.
    user?: object; // partial user
    token: string; // continuation token (for followup messages) use uuid ig
    version: number;
    message?: object; // for components, the message they were attached to
}