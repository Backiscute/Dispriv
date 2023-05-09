import { Router } from "express";
import { GenerateSnowflake, GetUserByRequest, VerifyAuth } from "../Modules/SnowflakeUtils";
import { DiscordApplication } from "../Entities/Application";

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
            Name: AppName,
            Owner: await GetUserByRequest(req),
            ID: GenerateSnowflake()
        });
        await Application.save();
        res.json(Application.Package());
   }
});

App.get("/applications/public", async (req, res) => {
    const AppIDs = req.query.application_ids;
    if (!AppIDs) return res.status(404).json({"message": "Missing query", "code": 0});

    const Apps = [];

    const ApplicationIds = AppIDs.toString().split(",");

    ApplicationIds.forEach(async (AppID) => {
        const Application = await DiscordApplication.findOneBy({ ID: AppID });
        if (Application) Apps.push(Application.PackagePublic());
    });

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
    // do funny here
});


module.exports = {
    DefaultAPI: "/api/v9/applications",
    App
};