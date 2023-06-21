import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { ApplicationFlags, UserFlags } from "../Classes/Flags";
import { DiscordApplication } from "../Entities/Application";
import { Channel, ChannelType } from "../Entities/Channel";
import { v4 } from "uuid";
import { VoiceSessions } from "../Handlers/RTCSocket";
import { SendToDMOrServer } from "../Modules/DiscordUtils";
import { OpCodes } from "../Classes/GatewayOpCodes";

const App = Router();

App.get("/:ApplicationID/test-mode", VerifyAuth, async (req, res) => { // enables app test mode in discord client (generally used for testing embedded apps)
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(403).json({"message": "403: No access bozo", "code": 0});
    res.sendStatus(204);
});

App.post("/:ChannelID/:ApplicationID", VerifyAuth, async (req, res) => { // authorizes a game activity launch
    const MyUser = await GetUserByRequest(req);
    const GuildID  = req.body.guild_id;
    const SessionID = req.body.session_id;

    if (!SessionID) return res.status(404).json({"message": "Missing body", "code": 0});
    if (!GuildID) return res.status(404).json({"message": "Missing body", "code": 0});

    const LinkedChannel = await Channel.findOne({ where: { ID: req.params.ChannelID }, relations: { OwnerGuild: true }, cache: true });

    if (!LinkedChannel) return res.status(404).json({"message": "Channel not found", "code": 0});
    if (LinkedChannel.Type != ChannelType.GUILD_VOICE) return res.status(404).json({"message": "Channel is not a voice channel", "code": 0});

    const Application = await DiscordApplication.findOne({ where: { ID: req.params.ApplicationID }, cache: true });

    if (!Application) return res.status(404).json({"message": "Application not found", "code": 0});
    if (!Application.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT)) return res.status(404).json({"message": "Application is not an activity", "code": 0});
    
    if (!Application.HasFlag(ApplicationFlags.RELEASED) && !MyUser.HasFlag(UserFlags.STAFF)) return res.status(403).json({"message": "Application is not released", "code": 0});

    const VoiceSession = VoiceSessions.find((R) => R.guild_id === GuildID && R.channel_id === LinkedChannel.ID);

    if (!VoiceSession) return res.status(404).json({"message": "Voice session not found", "code": 0});

    let ActivityRoom;

    const RunningActivity = VoiceSession.Activities.find((R) => R.embedded_activity.application_id === Application.ID);

    if (RunningActivity) 
    {
        if (RunningActivity.users.includes(MyUser.ID)) return res.status(403).json({"message": "Already in activity", "code": 0});
        
        RunningActivity.users.push(MyUser.ID);
        RunningActivity.connections.push({ user_id: MyUser.ID, metadata: { is_elegible_host: true } });

        ActivityRoom = RunningActivity;
    }
    else
    {
        const Activity = {
            "activity_id": v4(),
            "application_id": Application.ID,
            "assets": null,
            "created_at": null,
            "details": null,
            "name": Application.DisplayName,
            "secrets": null,
            "state": null,
            "timestamps": null,
            "type": 0
        };
    
        ActivityRoom = {
            channel_id: LinkedChannel.ID,
            connections: [{ user_id: MyUser.ID, metadata: { is_elegible_host: true } }],
            embedded_activity: Activity,
            guild_id: GuildID,
            users: [MyUser.ID]
        };
    
        VoiceSession.Activities.unshift(ActivityRoom);    
    }

    ActivityRoom["update_code"] = 2;

    await res.sendStatus(204);

    SendToDMOrServer(LinkedChannel, OpCodes.DISPATCH, ActivityRoom, null, "EMBEDDED_ACTIVITY_UPDATE");
}); 

App.get("/shelf", async (req, res) => { // embedded games library (game activities)
    const GuildID = req.query.guild_id;
    if (!GuildID) return res.status(404).json({"message": "Missing query", "code": 0});
    
    const Apps = await DiscordApplication.find({ cache: true });

    const EmbeddedApps = Apps.filter((R) => {
        return R.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT) && R.HasFlag(ApplicationFlags.RELEASED);
    });

    const BundleItems = [];

    EmbeddedApps.forEach((R) => {
        BundleItems.push({
            "application_id": R.ID,
            "expires_on": null,
            "new_until": null,
            "nitro_requirement": false,
            "premium_tier_level": 0,
            "always_free": true
        });
    });


    res.json({ activity_bundle_items: BundleItems, activities: EmbeddedApps.map((R) => R.PackagePublic()) });
});

module.exports = {
    DefaultAPI: "/api/v9/activities",
    App
};