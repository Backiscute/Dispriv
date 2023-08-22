/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { red } from "colorette";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { GatewayCloseCodes, OpCodes } from "../Classes/GatewayOpCodes";
import { Channel } from "../Entities/Channel";
import { VoiceSessions } from "../Handlers/RTCSocket";
import { SendToDMOrServer } from "../Modules/DiscordUtils";
import { CloseConnection } from "../Modules/GatewayUtils";
import { Msg } from "../Modules/Logger";

export async function HandleOpcode(UnpackedData: any, GatewayClient: GatewayConnection) {
    if (!GatewayClient.Account!)
        return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");

    const GuildID = UnpackedData.d.guild_id;
    const ChannelID = UnpackedData.d.channel_id;
    const ApplicationID = UnpackedData.d.application_id;

    if (!GuildID || !ChannelID || !ApplicationID) return;

    const VoiceSession = VoiceSessions.find((S) => S.guild_id === GuildID && S.channel_id === ChannelID);
    if (!VoiceSession) return;

    const Activity = VoiceSession.Activities.find(
        (A) => A.embedded_activity.application_id === ApplicationID,
    );

    if (!Activity) return;

    const ActivityUser = Activity.users.find((U) => U === GatewayClient.Account!.ID);

    if (!ActivityUser) return;

    const LinkedChannel = await Channel.findOne({
        where: { ID: ChannelID },
        relations: { OwnerGuild: true },
    });

    if (!LinkedChannel) return;

    if (Activity.users.length <= 1) {
        Msg(
            `Deleting activity ${red(Activity.embedded_activity.name)} from session ${red(
                VoiceSession.guild_id,
            )}:${red(VoiceSession.channel_id)}`,
            "Activities",
        );

        await SendToDMOrServer(
            LinkedChannel,
            OpCodes.DISPATCH,
            {
                channel_id: ChannelID,
                connections: [],
                embedded_activity: { application_id: ApplicationID },
                guild_id: GuildID,
                update_code: 3,
                users: [],
            },
            null,
            "EMBEDDED_ACTIVITY_UPDATE",
        );

        VoiceSession.Activities.splice(VoiceSession.Activities.indexOf(Activity), 1);
    }

    const UserConnection = Activity.connections.find((C) => C.user_id === GatewayClient.Account!.ID)!;

    Activity.users.splice(Activity.users.indexOf(ActivityUser), 1);
    Activity.connections.splice(Activity.connections.indexOf(UserConnection), 1);

    Activity.update_code = 5;

    await SendToDMOrServer(LinkedChannel, OpCodes.DISPATCH, Activity, null, "EMBEDDED_ACTIVITY_UPDATE");

}