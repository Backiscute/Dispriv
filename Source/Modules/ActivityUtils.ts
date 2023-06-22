import { ActivityUserConnection, EmbeddedActivity, VoiceSession, ActivityRoom } from "../Classes/VoiceSession";
import { DiscordApplication } from "../Entities/Application";
import { Channel } from "../Entities/Channel";
import { User } from "../Entities/User";
import { v4 } from "uuid";
import { SendToDMOrServer } from "./DiscordUtils";
import { OpCodes } from "../Classes/GatewayOpCodes";

export async function CreateOrJoinActivityRoom(LinkedChannel : Channel, Application : DiscordApplication, MyUser : User, VoiceSession : VoiceSession) : Promise<ActivityRoom>
{
    let ActivityRoom;

    const RunningActivity = VoiceSession.Activities.find((R) => R.embedded_activity.application_id === Application.ID);

    if (RunningActivity) {
        if (RunningActivity.users.includes(MyUser.ID))
            return RunningActivity;

        RunningActivity.users.push(MyUser.ID);
        RunningActivity.connections.push({ user_id: MyUser.ID, metadata: { is_elegible_host: true } });

        ActivityRoom = RunningActivity;
    } else {
        const Activity = {
            activity_id: v4(),
            application_id: Application.ID,
            assets: [],
            created_at: undefined,
            details: undefined,
            name: Application.DisplayName,
            secrets: undefined,
            state: undefined,
            timestamps: undefined,
            type: 0,
        } as EmbeddedActivity;

        ActivityRoom = {
            channel_id: LinkedChannel.ID,
            connections: [{ user_id: MyUser.ID, metadata: { is_elegible_host: true } }] as ActivityUserConnection[],
            embedded_activity: Activity,
            guild_id: VoiceSession.guild_id,
            users: [MyUser.ID],
        } as ActivityRoom;

        VoiceSession.Activities.push(ActivityRoom);
    }

    ActivityRoom.update_code = 2;

    await SendToDMOrServer(LinkedChannel, OpCodes.DISPATCH, ActivityRoom, null, "EMBEDDED_ACTIVITY_UPDATE");

    return ActivityRoom;
}