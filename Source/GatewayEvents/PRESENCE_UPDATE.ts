/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GatewayConnection } from "../Classes/GatewayConnection";
import { GatewayCloseCodes } from "../Classes/GatewayOpCodes";
import { Presence } from "../Classes/Presence";
import { Guild } from "../Entities/Guild";
import { RequestGatewayAccount, SendGuildStatusUpdate, SyncMemberList } from "../Modules/DiscordUtils";
import { CloseConnection } from "../Modules/GatewayUtils";

export async function HandleOpcode(UnpackedData: any, GatewayClient: GatewayConnection) {
    if (!GatewayClient.Account)
        return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");

    GatewayClient.Account = (await RequestGatewayAccount(GatewayClient.UserToken))!; // relod

    switch (UnpackedData.d.status) {
        case "online":
            GatewayClient.Account.Presence = Presence.ONLINE;
            break;
        case "idle":
            GatewayClient.Account.Presence = Presence.IDLE;
            break;
        case "dnd":
            GatewayClient.Account.Presence = Presence.DND;
            break;
        case "invisible":
            GatewayClient.Account.Presence = Presence.INVISIBLE;
            break;
        default:
            GatewayClient.Account.Presence = Presence.UNKNOWN;
    }
    await GatewayClient.Account.save();
    // GatewayClient.Account.Memberships.map((M) => M.ToGuild).map(async (G) => await Guild.findOne({where: {ID: G.ID}, relations: { Members: true }})).forEach((G) => UpdateMemberList(G));
    const Guilds = await Promise.all(
        GatewayClient.Account.Memberships.map((M) => M.ToGuild).map(async (G) => {
            return await Guild.findOne({ where: { ID: G.ID }, relations: { Members: true } });
        }),
    );
    Guilds.forEach((G) => {
        if (!G) return;
        const CurrentMembership = G.Members.find((M) => (M.Owner.ID = GatewayClient.Account?.ID || ""));
        if (!CurrentMembership) return;
        SyncMemberList(G);
    // UpdateMemberList(G, CurrentMembership);
    //         C
    //             ? SendOp(C, OpCodes.DISPATCH, {
    //                 user: C.Account
    //             }, null, "GUILD_MEMBER_UPDATE")
    //             : null,
    //     );
    //     SendToMembers(
    //         G.ID,
    //         OpCodes.DISPATCH,
    //         {
    //             user: GatewayClient.Account?.PackageSmall(),
    //             status: "online",
    //             client_status: {
    //                 web: "online",
    //             },
    //             guild_id: "1130498665497100288",
    //             broadcast: null,
    //             activities: [
    //                 // {
    //                 //     type: 4,
    //                 //     state: "crazy? i was crazy once. they locked me in a room. a rubber room. a rubber room with rats. and rats make me crazy.",
    //                 //     name: "Custom Status",
    //                 //     id: "custom",
    //                 //     emoji: {
    //                 //         name: "🤪",
    //                 //     },
    //                 //     created_at: 1689734268424,
    //                 // },
    //                 // {
    //                 //     type: 2,
    //                 //     timestamps: {
    //                 //         start: 1689734251754,
    //                 //         end: 1689734433254,
    //                 //     },
    //                 //     sync_id: "1LTBpEzgN3dplgZG2qo8bO",
    //                 //     state: "Jordana; TV Girl",
    //                 //     session_id: "6e7a14333499d23bb9a192973a0d0a48",
    //                 //     party: {
    //                 //         id: "spotify:1053012491006910504",
    //                 //     },
    //                 //     name: "Spotify",
    //                 //     id: "spotify:1",
    //                 //     flags: 48,
    //                 //     details: "Ordinary Day",
    //                 //     created_at: 1689734261303,
    //                 //     assets: {
    //                 //         large_text: "Summer's Over",
    //                 //         large_image: "spotify:ab67616d0000b27379c72e2c38f9d47a19dc1ecc",
    //                 //     },
    //                 // },
    //             ],
    //         },
    //         null,
    //         "GUILD_MEMBER_UPDATE",
    //     );
    // });
    });
    SendGuildStatusUpdate(GatewayClient.Account, GatewayClient.Account.Presence);
}