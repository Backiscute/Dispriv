/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Router } from "express";
import { GenerateToken, GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { DiscordApplication, EmbeddedAppConfig } from "../Entities/Application";
import { ApplicationFlags } from "../Classes/Flags";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { User } from "../Entities/User";
import { GenerateRandomString } from "../Modules/DiscordUtils";
import bcrypt from "bcrypt";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { CreateGlobalCommandSchema } from "../Validators/Applications";
import { SlashCommand } from "../Entities/SlashCommand";
import { Msg } from "../Modules/Logger";

const App = Router();

App.get("/", VerifyAuth(false), async (req, res) => {
    const UserData = await GetUserByRequest(req, { Applications: { Bot: true } });
    res.json([...UserData!.Applications.map((R) => R.Package())]);
});

App.post("/", VerifyAuth(false), async (req, res) => {
    const AppName = req.body.name;
    const TeamID = req.body.team_id;

    if (!AppName) return res.status(404).json({ message: "Missing Name", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });

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

App.post("/:ApplicationID/bot", VerifyAuth(false), async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: { Bot: true } });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);

    if (!Application) return res.status(404).json({ message: "Unknown Application", code: JsonErrorCodes.UNKNOWN_APPLICATION });

    if (Application.Bot) return res.status(400).json({ message: "Application already has a bot", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });

    const Password = bcrypt.hashSync(GenerateRandomString(32), 10);

    const BotUser = await User.create({
        Bot: true,
        BotApplication: Application,
        Username: Application.DisplayName,
        ID: GenerateSnowflake(),
        Email: `${Application.ID}@discord.com`,
        Settings: {
            locale: "en-US",
            theme: "dark",
        },
        Password,
        Bio: "",
        DateOfBirth: new Date(),
        TutorialReadIndicators: []
    });

    await BotUser.save();

    Application.Bot = BotUser;

    await Application.save();

    res.json(BotUser.Package());
});

App.post("/:ApplicationID/bot/reset", VerifyAuth(false), async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: { Bot: true } });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);

    if (!Application) return res.status(404).json({ message: "Unknown Application", code: JsonErrorCodes.UNKNOWN_APPLICATION });

    if (!Application.Bot) return res.status(400).json({ message: "Application has no bot", code: JsonErrorCodes.OAUTH2_APPLICATION_WITHOUT_BOT });

    Application.Bot.Password = bcrypt.hashSync(GenerateRandomString(32), 10);

    await Application.Bot.save();

    const Token = GenerateToken(Application.Bot.ID, Date.now(), Application.Bot.Password);

    res.json({ token: Token });
});

App.get("/:ApplicationID/embedded-activity-config", VerifyAuth(false), async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application || !Application.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT))
        return res.status(404).json({ message: "Unknown Application", code: JsonErrorCodes.UNKNOWN_APPLICATION });

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

App.patch("/:ApplicationID/embedded-activity-config", VerifyAuth(false), async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: true });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application || !Application.HasFlag(ApplicationFlags.EMBEDDED_IN_CLIENT))
        return res.status(404).json({ message: "Unknown Application", code: JsonErrorCodes.UNKNOWN_APPLICATION });

    if (!Application.embedded_activity_config)
        return res.status(404).json({ message: "Application does not have embedded activity config", code: JsonErrorCodes.UNKNOWN_APPLICATION });

    Object.keys(req.body).forEach((Key) => {
        if (Object.prototype.hasOwnProperty.call(Application.embedded_activity_config, Key))
        {  
            //@ts-expect-error because it aint a nuclear reactor
            Application.embedded_activity_config![Key] = req.body[Key];
        }
    });

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

App.get("/:ApplicationID", VerifyAuth(false), async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: { Bot: true } });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(404).json({ message: "404: Not Found", code: 0 });
    res.json(Application.Package());
});

App.patch("/:ApplicationID/bot", VerifyAuth(false), async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: { Bot: true } });
    const Application = UserData!.Applications.find((R) => R.ID === AppID);
    if (!Application) return res.status(404).json({ message: "404: Not Found", code: 0 });

    if (!Application.Bot) return res.status(400).json({ message: "Application has no bot", code: JsonErrorCodes.OAUTH2_APPLICATION_WITHOUT_BOT });

    for (const Key of Object.keys(req.body)) {
        const Value = req.body[Key];
        switch (Key) {
            case "username": 
                if (typeof Value !== "string") break;
                if (Value.length > 32) break;

                Application.Bot!.Username = Value;
                break;
        }
    }

    await Application.Bot.save();

    res.json(Application.Bot.PackageSmall());
});

App.patch("/:ApplicationID", VerifyAuth(false), async (req, res) => {
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
            case "description":
                if (typeof Value !== "string") break;
                if (Value.length > 128) break;

                Application.Description = Value;
                break;
            case "summary":
                if (typeof Value !== "string") break;
                if (Value.length > 128) break;
                
                Application.Summary = Value;
                break;
            case "bot_public":
                if (typeof Value !== "boolean") break;

                Application.PublicBot = Value;
                break;
            case "bot_require_code_grant":
                if (typeof Value !== "boolean") break;

                Application.BotRequireCodeGrant = Value;
                break;
            case "flags":
            {
                if (typeof Value !== "number") break;
                const AllowedFlags = ApplicationFlags.GATEWAY_PRESENCE | ApplicationFlags.GATEWAY_PRESENCE_LIMITED | ApplicationFlags.GATEWAY_GUILD_MEMBERS | ApplicationFlags.GATEWAY_GUILD_MEMBERS_LIMITED | ApplicationFlags.GATEWAY_MESSAGE_CONTENT | ApplicationFlags.GATEWAY_MESSAGE_CONTENT_LIMITED;

                if (Value != (Value & AllowedFlags)) break;

                Application.Flags = Value;
                break;
            }
        }
    }

    await Application.save();

    res.json(Application.Package());
});

App.put("/:ApplicationID/commands", VerifyAuth(), async (req, res, next) => {
    ValidateRequest(req, res, next, CreateGlobalCommandSchema);
},
async (req, res) => {
    const AppID = req.params.ApplicationID;
    const UserData = await GetUserByRequest(req, { Applications: { Bot: true, SlashCommands: { LinkedApplication: true } } });
    const Application = await DiscordApplication.findOne({ where: { Bot: { ID: UserData?.ID }, ID: AppID }, relations: { Bot: true, SlashCommands: true }});

    if (!Application) return res.status(404).json({ message: "404: Not Found", code: 0 });

    if (!Application.Bot)
        return res
            .status(400)
            .json({ message: "Application has no bot", code: JsonErrorCodes.OAUTH2_APPLICATION_WITHOUT_BOT });

    /*
    Your app cannot have two global CHAT_INPUT commands with the same name
    Your app cannot have two guild CHAT_INPUT commands within the same name on the same guild
    Your app cannot have two global USER commands with the same name
    Your app can have a global and guild CHAT_INPUT command with the same name
    Your app can have a global CHAT_INPUT and USER command with the same name
    Multiple apps can have commands with the same names
    */

    const AddedCommands = [];

    for ( const Command of req.body ) {
        const CommandName = Command.name;
        const CommandType = Command.type;
        const CommandDescription = Command.description ?? "No description provided.";
        const CommandOptions = Command.options || [];
        const CommandDefaultPermission = Command.default_member_permissions ?? null;

        // check if commandname is already used
        const CommandNameUsed = Application.SlashCommands.find((R) => R.Name === CommandName && R.Type === CommandType);
        if (CommandNameUsed) continue;

        Msg(`Creating slash command ${CommandName} for "${Application.DisplayName}:${Application.ID}"`, "Applications");

        const NewSlashCommand = await SlashCommand.create({
            ID: GenerateSnowflake(),
            LinkedApplication: Application,
            Name: CommandName,
            Type: CommandType,
            Description: CommandDescription,
            Options: JSON.stringify(CommandOptions),
            DefaultMemberPermission: CommandDefaultPermission,
            Global: true,
            Version: GenerateSnowflake()
        });

        await NewSlashCommand.save();

        AddedCommands.push(NewSlashCommand.Package());
    }

    res.json(AddedCommands);
});

module.exports = {
    DefaultAPI: "/api/v9/applications",
    App,
};