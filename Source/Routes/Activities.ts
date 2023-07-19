import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { ApplicationFlags, UserFlags } from "../Classes/Flags";
import { DiscordApplication } from "../Entities/Application";
import { Channel, ChannelType } from "../Entities/Channel";
import { VoiceSessions } from "../Handlers/RTCSocket";
import { BundleItem } from "../Classes/VoiceSession";
import { CreateOrJoinActivityRoom } from "../Modules/ActivityUtils";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";

const App = Router();

App.get("/:ApplicationID/test-mode", VerifyAuth, async (req, res) => {
    // enables app test mode in discord client (generally used for testing embedded apps)
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(403).json({ message: "Unauthorized", code: JsonErrorCodes.UNAUTHORIZED });
    res.sendStatus(204);
});

App.post("/:ChannelID/:ApplicationID", VerifyAuth, async (req, res) => {
    // authorizes a game activity launch
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const MyUser = (await GetUserByRequest(req))!;
    const GuildID = req.body.guild_id;
    const SessionID = req.body.session_id;

    if (!SessionID) return res.status(404).json({ message: "Invalid Form Body", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });
    if (!GuildID) return res.status(404).json({ message: "Invalid Form Body", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });

    const LinkedChannel = await Channel.findOne({
        where: { ID: req.params.ChannelID },
        relations: { OwnerGuild: true },
        cache: true,
    });

    if (!LinkedChannel) return res.status(404).json({ message: "Unknown Channel", code: JsonErrorCodes.UNKNOWN_CHANNEL });
    if (LinkedChannel.Type != ChannelType.GUILD_VOICE)
        return res.status(404).json({ message: "Channel is not a voice channel", code: 0 });

    const Application = await DiscordApplication.findOne({ where: { ID: req.params.ApplicationID }, cache: true });

    if (!Application) return res.status(404).json({ message: "Application not found", code: 0 });
    if (!Application.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT))
        return res.status(404).json({ message: "Application is not an activity", code: 0 });

    if (!Application.HasFlag(ApplicationFlags.RELEASED) && !MyUser.HasFlag(UserFlags.STAFF))
        return res.status(403).json({ message: "Application is not released", code: 0 });

    const VoiceSession = VoiceSessions.find((R) => R.guild_id === GuildID && R.channel_id === LinkedChannel.ID);

    if (!VoiceSession) return res.status(404).json({ message: "Voice session not found", code: 0 });

    await CreateOrJoinActivityRoom(LinkedChannel, Application, MyUser, VoiceSession);
    
    res.sendStatus(204);
});

App.get("/shelf", async (req, res) => {
    // embedded games library (game activities)
    const GuildID = req.query.guild_id;
    if (!GuildID) return res.status(404).json({ message: "Missing query", code: 0 });

    const Apps = await DiscordApplication.find({ cache: true });

    const EmbeddedApps = Apps.filter((R) => {
        return R.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT) && R.HasFlag(ApplicationFlags.RELEASED);
    });

    const BundleItems: BundleItem[] = [];

    EmbeddedApps.forEach((R) => {
        const isDuplicate = BundleItems.some(item => item.application_id === R.ID);
        if (!isDuplicate) {
            BundleItems.push({
                application_id: R.ID,
                expires_on: undefined,
                new_until: undefined,
                nitro_requirement: false,
                premium_tier_level: 0,
                always_free: true,
            });
        }
    });

    const Activities: object[] = [];

    EmbeddedApps.forEach((R) => {
        const Fr = {
            "client_platform_config": {
                "web": {
                    "label_type": 0,
                    "label_until": null,
                    "release_phase": "global_launch"
                },
                "ios": {
                    "label_type": 0,
                    "label_until": null,
                    "release_phase": "global_launch"
                },
                "android": {
                    "label_type": 0,
                    "label_until": null,
                    "release_phase": "global_launch"
                }
            }
        };
        const ForReal = {...R.embedded_activity_config, ...Fr};
        Activities.push({
            application_id: R.ID,
            ...ForReal
        });
    });

    res.json({ activity_bundle_items: BundleItems, activities: Activities, applications: EmbeddedApps.map((R) => R.PackagePublic()) });
});

module.exports = {
    DefaultAPI: "/api/v9/activities",
    App,
};
