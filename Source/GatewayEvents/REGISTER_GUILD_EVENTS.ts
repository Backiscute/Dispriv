/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GatewayConnection } from "../Classes/GatewayConnection";
import { Guild } from "../Entities/Guild";
import { SyncMemberList } from "../Modules/DiscordUtils";

export async function HandleOpcode(UnpackedData: any, GatewayClient: GatewayConnection) {
    const Data = UnpackedData.d;
    // {
    //     guild_id: "1130498665497100288",
    //     typing: true,
    //     activities: true,
    //     threads: true,
    //     channels: {
    //         "1130498665513877504": [[0, 99]],
    //     },
    // };
    const FoundGuild = await Guild.findOne({
        where: { ID: Data.guild_id },
        relations: { Members: true },
    });
    if (!FoundGuild) return;
    SyncMemberList(FoundGuild);
}