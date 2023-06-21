/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { DiscordApplication, EmbeddedAppConfig } from "../Entities/Application";
import { ApplicationFlags } from "../Classes/Flags";

const App = Router();

App.get("/", VerifyAuth, async (req, res) => {
    const UserData = await GetUserByRequest(req, { Applications: true });
    res.json([...UserData!.Applications.map((R) => R.Package())]);
});

App.post("/", VerifyAuth, async (req, res) => {
    const AppName = req.body.name;
    const TeamID = req.body.team_id;

    if (!AppName) return res.status(404).json({ message: "Missing Name", code: 0 });

    if (!TeamID) {
        const Application = DiscordApplication.create({
            DisplayName: AppName,
            Owner: (await GetUserByRequest(req))!,
            ID: GenerateSnowflake(),
        });
        await Application.save();
        res.json(Application.Package());
    }
});

App.get("/:ApplicationID/embedded-activity-config", VerifyAuth, async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application || !Application.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT))
        return res.status(404).json({ message: "404: Not Found", code: 0 });

    if (!Application.embedded_activity_config) {
        const NewAppConfig = EmbeddedAppConfig.create({
            supported_platforms: ["web", "ios", "android"],
        });

        Application.embedded_activity_config = NewAppConfig;

        await NewAppConfig.save();
        await Application.save();
    }

    const AppPackage = Application.Package();
    res.json(AppPackage.embedded_activity_config);
});

App.patch("/:ApplicationID/embedded-activity-config", VerifyAuth, async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application || !Application.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT))
        return res.status(404).json({ message: "404: Not Found", code: 0 });

    for (const Key of Object.keys(req.body))
        switch (Key) {
            case "ID":
                Application.embedded_activity_config!.ID = req.body.ID;
                break;
            case "MaxParticipants":
                Application.embedded_activity_config!.max_participants = req.body.MaxParticipants;
                break;
            case "IsEighteenPlus":
                Application.embedded_activity_config!.requires_age_gate = req.body.IsEighteenPlus;
                break;
            case "NeedsNitro":
                Application.embedded_activity_config!.premium_tier_requirement = req.body.NeedsNitro;
                break;
            case "FreePeriodStarts":
                Application.embedded_activity_config!.free_period_starts_at = req.body.FreePeriodStarts;
                break;
            case "FreePeriodEnds":
                Application.embedded_activity_config!.free_period_ends_at = req.body.FreePeriodEnds;
                break;
            case "ActivityPreviewVideoID":
                Application.embedded_activity_config!.activity_preview_video_asset_id = req.body.ActivityPreviewVideoID;
                break;
            case "SupportsPlatforms":
                Application.embedded_activity_config!.supported_platforms = req.body.SupportsPlatforms;
                break;
            case "DefaultOrientation":
                Application.embedded_activity_config!.default_orientation_lock_state = req.body.DefaultOrientation;
                break;
            case "TabletDefaultOrientation":
                Application.embedded_activity_config!.tablet_default_orientation_lock_state =
                    req.body.TabletDefaultOrientation;
                break;
            case "ShelfPriority":
                Application.embedded_activity_config!.shelf_rank = req.body.ShelfPriority;
                break;
        }
    await Application.save();

    const AppPackage = await Application.Package();
    res.json(AppPackage.embedded_activity_config);
});

App.get("/public", async (req, res) => {
    const AppIDs = req.query.application_ids;
    if (!AppIDs) return res.status(404).json({ message: "Missing query", code: 0 });

    const Apps = [];

    const ApplicationIds = AppIDs.toString().split(",");

    for (const AppID of ApplicationIds) {
        console.log({ ID: AppID });
        const Application = await DiscordApplication.findOneBy({ ID: AppID });

        if (!Application) continue;

        const AppPackage = Application.PackagePublic();
        await Apps.unshift(AppPackage);
        console.log(Apps);
        console.log(AppPackage);
    }

    res.json(Apps);
});

App.get("/:ApplicationID/public", async (req, res) => {
    const AppID = req.params.ApplicationID;
    const Application = await DiscordApplication.findOneBy({ ID: AppID });
    if (!Application) return res.status(404).json({ message: "404: Not Found", code: 0 });

    res.json(Application.PackagePublic());
});

App.get("/:ApplicationID", VerifyAuth, async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(404).json({ message: "404: Not Found", code: 0 });
    res.json(Application.Package());
});

App.patch("/:ApplicationID", VerifyAuth, async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(404).json({ message: "404: Not Found", code: 0 });

    for (const Key of Object.keys(req.body)) {
        const Value = req.body[Key];
        switch (Key) {
            case "name":
                if (typeof Value !== "string") break;
                if (Value.length > 128) break;

                Application.DisplayName = Value;
                break;
        }
    }

    await Application.save();

    res.json(Application.Package());
});

module.exports = {
    DefaultAPI: "/api/v9/applications",
    App,
};
