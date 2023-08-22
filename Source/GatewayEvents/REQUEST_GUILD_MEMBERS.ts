/* eslint-disable @typescript-eslint/no-explicit-any */
import { GatewayConnection } from "../Classes/GatewayConnection";
import { GatewayCloseCodes } from "../Classes/GatewayOpCodes";
import { Guild } from "../Entities/Guild";
import { CloseConnection } from "../Modules/GatewayUtils";

export async function HandleOpcode(UnpackedData: any, GatewayClient: GatewayConnection) {
    // eslint-disable-next-line no-inner-declarations, no-unused-vars, @typescript-eslint/no-unused-vars
    async function Chunk(GuildID: string, Nonce: string) {
        const UserGuild = await Guild.findOne({
            where: { ID: GuildID },
            select: { ID: true, Members: true, Roles: true },
            relations: { Members: true, Roles: true }
        });
        if (!UserGuild) return; // no guild
        // ur not catching error
    }

    if (!GatewayClient.Account)
        return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");
    const Data = UnpackedData.d;

    Array.isArray(Data.guild_id)
        ? Data.guild_id.forEach((GuildID: string) => Chunk(GuildID, Data.nonce))
        : Chunk(Data.guild_id, Data.nonce);
}