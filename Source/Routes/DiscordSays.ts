import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { GenerateOAuth2Token, GetUserByOAuthReq, VerifyOAuthReq } from "../Modules/AuthUtils";
import { Router } from "express";
import bcrypt from "bcrypt";
import { OAuth2App } from "../Entities/OAuth2";
import { User } from "../Entities/User";

const App = Router();

App.post("/:ApplicationID/api/token", async (req, res) => {
    const Token = req.body.code;

    if (!Token) return res.status(404).json({ message: "Missing Token", code: JsonErrorCodes.InvalidFormBody });

    const UserID = Token.split("-")[0];

    const MyUser = await User.findOne({ where: { ID: UserID }, relations: { AuthorizedApps: { Application: true } } });

    if (!MyUser) return res.status(404).json({ message: "User not found", code: JsonErrorCodes.UnknownUser });

    const OAuthApp = MyUser?.AuthorizedApps.find((R: OAuth2App) => R.Application.ID === req.params.ApplicationID);

    if (OAuthApp === undefined) return res.status(404).json({ message: "Authorized Application not found", code: JsonErrorCodes.UnknownApplication });

    const TokenCheck = bcrypt.compareSync(`${OAuthApp.ID}-${MyUser?.ID}`, Token.split("-")[1]);

    if (!TokenCheck) return res.status(404).json({ message: "Invalid Token", code: JsonErrorCodes.InvalidToken });

    // generate a token for api and stuff ig

    const GeneratedOAuthToken = await GenerateOAuth2Token(OAuthApp.ID);
    res.json({ access_token: GeneratedOAuthToken });
});

App.get("/:ApplicationID/discord/api/users/@me/guilds/:GuildID/member", VerifyOAuthReq, async (req, res) => {
    const MyUser = await GetUserByOAuthReq(req, { Memberships: { ToGuild: true } });

    if (!MyUser) return res.status(404).json({ message: "User not found", code: JsonErrorCodes.UnknownUser });

    const UserMembership = MyUser.Memberships.find((M) => M.ToGuild.ID === req.params.GuildID);

    if (UserMembership === undefined) return res.status(404).json({ message: "User not in guild", code: JsonErrorCodes.UnknownGuild });

    res.json(UserMembership.Package());
});

module.exports = {
    DefaultAPI: "/discordsays",
    App,
};