/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { red } from "colorette";
import { GatewayConnection } from "../Classes/GatewayConnection";
import { GatewayCloseCodes, OpCodes } from "../Classes/GatewayOpCodes";
import { VoiceServerUpdatePacket } from "../Classes/GatewayPackets";
import { ChannelType, Channel } from "../Entities/Channel";
import { VoiceSessions } from "../Handlers/RTCSocket";
import { SendToMembers, SendToDMOrServer } from "../Modules/DiscordUtils";
import { CloseConnection, SendOp } from "../Modules/GatewayUtils";
import { Msg } from "../Modules/Logger";
import bcrypt from "bcrypt";

export async function HandleOpcode(UnpackedData: any, GatewayClient: GatewayConnection) {
    if (!GatewayClient.Account!)
        return CloseConnection(GatewayClient, GatewayCloseCodes.NotAuthenticated, "Not authenticated");

    // {"op":4,"d":{"guild_id":null,"channel_id":null,"self_mute":true,"self_deaf":false,"self_video":false,"flags":0}}
    // {"op":4,"d":{"guild_id":"1119711696458481664","channel_id":"1120028684745572352","self_mute":true,"self_deaf":false,"self_video":false,"flags":2}}
    const ChannelID = UnpackedData.d.channel_id;
    const GuildID = UnpackedData.d.guild_id;

    if (GuildID && ChannelID) {
        const UserMembership = GatewayClient.Account!.Memberships.find((M) => M.ToGuild.ID === GuildID);
        if (!UserMembership) return;

        const Guild = UserMembership.ToGuild;

        const LinkedChannel = Guild.Channels.find((C) => C.ID === ChannelID);
        if (!LinkedChannel) return;

        if (LinkedChannel.Type != ChannelType.GUILD_VOICE) return;

        // add permissions to check if can connect to voice channel

        const VoiceSession = VoiceSessions.find(
            (S) => S.guild_id === GuildID && S.channel_id === ChannelID,
        );

        const VoiceState = {
            channel_id: ChannelID,
            deaf: UserMembership.Deafened,
            guild_id: GuildID,
            mute: UserMembership.Muted,
            request_to_speak_timestamp: null,
            self_deaf: UnpackedData.d.self_deaf,
            self_mute: UnpackedData.d.self_mute,
            self_video: UnpackedData.d.self_video,
            session_id: GatewayClient.ID,
            suppress: false,
            user_id: GatewayClient.Account!.ID,
            member: UserMembership.PackageGatewayVoice(),
        };

        if (VoiceSession) {
            if (
                VoiceSession.voice_states.some(
                    (state) =>
                        state.user_id === GatewayClient.Account!.ID &&
                                    state.session_id === GatewayClient.ID,
                )
            ) {
                // user is already in the voice session, edit muted and deaf (self)
                const UserVoiceState = VoiceSession.voice_states.find(
                    (state) => state.user_id === GatewayClient.Account!.ID,
                );
                            UserVoiceState!.self_mute = UnpackedData.d.self_mute;
                            UserVoiceState!.self_deaf = UnpackedData.d.self_deaf;
                            UserVoiceState!.self_video = UnpackedData.d.self_video;

                            await SendToMembers(GuildID, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");

                            return;
            } else if (
                VoiceSession.voice_states.some(
                    (state) =>
                        state.user_id === GatewayClient.Account!.ID && state.session_id != GatewayClient.ID,
                )
            ) {
                // user is in another client, remove old client
                const UserVoiceState = VoiceSession.voice_states.find(
                    (state) => state.user_id === GatewayClient.Account!.ID,
                );
                VoiceSession.voice_states.splice(VoiceSession.voice_states.indexOf(UserVoiceState!), 1);

                await SendToMembers(GuildID, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");
            }

            Msg(
                `Connecting User ${red(GatewayClient.Account!.Username)} to voice channel ${red(
                    LinkedChannel.DisplayName,
                )} in guild ${red(Guild.Name)}`,
                "Voice",
            );
            VoiceSession.voice_states.push(VoiceState);

            await SendToMembers(GuildID, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");
            SendOp<VoiceServerUpdatePacket>(
                GatewayClient,
                OpCodes.DISPATCH,
                {
                    endpoint: "rotterdam11006.discord.media:443",
                    guild_id: GuildID,
                    token: bcrypt.hashSync(
                        `${GuildID}-${GatewayClient.Account!.ID}-${GatewayClient.ID}-${GatewayClient.Account!.Password
                        }`,
                        10,
                    ),
                },
                null,
                "VOICE_SERVER_UPDATE",
            );
        } else {
            Msg(
                `Creating new voice session for guild ${red(Guild.Name)} in channel ${red(
                    LinkedChannel.DisplayName,
                )}`,
                "Voice",
            );

            VoiceSessions.push({
                channel_id: ChannelID,
                guild_id: GuildID,
                voice_states: [VoiceState],
                ConnectedVoiceClients: [],
                Activities: [],
            });

            await SendToMembers(GuildID, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");
            SendOp<VoiceServerUpdatePacket>(
                GatewayClient,
                OpCodes.DISPATCH,
                {
                    endpoint: "rotterdam11006.discord.media:443",
                    guild_id: GuildID,
                    token: bcrypt.hashSync(
                        `${GuildID}-${GatewayClient.Account!.ID}-${GatewayClient.ID}-${GatewayClient.Account!.Password
                        }`,
                        10,
                    ),
                },
                null,
                "VOICE_SERVER_UPDATE",
            );
        }
    } else if (
        !GuildID &&
                    !ChannelID &&
                    VoiceSessions.some((S) =>
                        S.voice_states.some((state) => state.user_id === GatewayClient.Account!.ID),
                    )
    ) {
        const VoiceSession = VoiceSessions.find((S) =>
            S.voice_states.some((state) => state.user_id === GatewayClient.Account!.ID),
        )!;

        const VoiceState = VoiceSession.voice_states.find(
            (state) => state.user_id === GatewayClient.Account!.ID,
        );

        if (!VoiceState) return;

        VoiceSession.voice_states.splice(VoiceSession.voice_states.indexOf(VoiceState), 1);

        VoiceState.channel_id = null;

        await SendToMembers(VoiceState.guild_id, OpCodes.DISPATCH, VoiceState, null, "VOICE_STATE_UPDATE");

        if (VoiceSession.voice_states.length === 0) {
            const LinkedChannel = await Channel.findOne({
                where: { ID: VoiceSession.channel_id },
                relations: { OwnerGuild: true },
            });

            if (!LinkedChannel) return;

            VoiceSession.Activities.forEach(async (Activity) => {
                VoiceSession.Activities.splice(VoiceSession.Activities.indexOf(Activity), 1);
                await SendToDMOrServer(
                    LinkedChannel,
                    OpCodes.DISPATCH,
                    {
                        channel_id: Activity.channel_id,
                        connections: [],
                        embedded_activity: { application_id: Activity.embedded_activity.application_id },
                        guild_id: Activity.guild_id,
                        update_code: 3,
                        users: [],
                    },
                    null,
                    "EMBEDDED_ACTIVITY_UPDATE",
                );
            });

            VoiceSessions.splice(VoiceSessions.indexOf(VoiceSession), 1);
        }
    }

}