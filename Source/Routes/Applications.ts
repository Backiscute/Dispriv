import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { DiscordApplication, EmbeddedAppConfig } from "../Entities/Application";
import { ApplicationFlags } from "../Classes/Flags";
import { Msg } from "../Modules/Logger";

const App = Router();

App.get("/", VerifyAuth, async (req, res) => {
    const UserData = await GetUserByRequest(req, { Applications: true });
    res.json([ ...UserData.Applications.map((R) => R.Package()) ]);
});

App.post("/", VerifyAuth, async (req, res) => {
   const AppName = req.body.name;
   const TeamID = req.body.team_id;

   if (!AppName) return res.status(404).json({"message": "Missing Name", "code": 0});

   if (!TeamID) {
        const Application = DiscordApplication.create({
            DisplayName: AppName,
            Owner: await GetUserByRequest(req),
            ID: GenerateSnowflake()
        });
        await Application.save();
        res.json(Application.Package());
   }
});

App.get("/:ApplicationID/embedded-activity-config", VerifyAuth, async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData.Applications.find((R) => R.ID === AppID);
    if (!Application || !Application.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT)) return res.status(404).json({"message": "404: Not Found", "code": 0});

    if (!Application.EmbeddedConfig)
    {
        const NewAppConfig = EmbeddedAppConfig.create({
            SupportsPlatforms: ["web", "ios", "android"],
        });

        Application.EmbeddedConfig = NewAppConfig;

        await NewAppConfig.save();
        await Application.save();
    }

    const AppPackage = Application.Package();
    res.json(AppPackage.embedded_activity_config);
});

App.patch("/:ApplicationID/embedded-activity-config", VerifyAuth, async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData.Applications.find((R) => R.ID === AppID);
    if (!Application || !Application.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT)) return res.status(404).json({"message": "404: Not Found", "code": 0});

    Object.keys(req.body).forEach(K => {
        Application.EmbeddedConfig[K] = req.body[K];
    });

    await Application.save();

    const AppPackage = Application.Package();
    res.json(AppPackage.embedded_activity_config);
});


App.get("/public", async (req, res) => {
    const AppIDs = req.query.application_ids;
    if (!AppIDs) return res.status(404).json({"message": "Missing query", "code": 0});

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
    if (!Application) return res.status(404).json({"message": "404: Not Found", "code": 0});

    res.json(Application.PackagePublic());
});

App.get("/:ApplicationID", VerifyAuth, async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(404).json({"message": "404: Not Found", "code": 0});
    res.json(Application.Package());
});

App.patch("/:ApplicationID", VerifyAuth, async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(404).json({"message": "404: Not Found", "code": 0});
   
    const DisallowedEdits = ["flags", "owner", "bot", "team", "embedded_activity_config", "hook", "discovery_eligibility_flags"];

    const FilteredBody = {};
    for (const Key in req.body)
        if (!DisallowedEdits.includes(Key.toLowerCase()))
            FilteredBody[Key] = req.body[Key];

    console.log(FilteredBody);

    Object.keys(FilteredBody).forEach(K => {
        Msg("Setting " + K + " to " + FilteredBody[K] + " in " + Application.ID);
        Application[K] = FilteredBody[K];
    });

    await Application.save();

    const AppPackage = Application.Package();
    res.json(AppPackage);
});

module.exports = {
    DefaultAPI: "/api/v9/applications",
    App
};