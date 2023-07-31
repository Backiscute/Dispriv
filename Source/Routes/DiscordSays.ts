import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { GenerateOAuth2Token, GetUserByOAuthReq, VerifyOAuthReq } from "../Modules/AuthUtils";
import { Router } from "express";
import bcrypt from "bcrypt";
import { OAuth2App } from "../Entities/OAuth2";
import { User } from "../Entities/User";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { TokenSchema } from "../Validators/DiscordSays";

// Authorization endpoints for different applications

const App = Router();

App.post(
    "/:ApplicationID/api/token",
    ValidateRequest(TokenSchema),
    async (req, res) => {
        const Token = req.body.code;
        const UserID = Token.split("-")[0];

        const MyUser = await User.findOne({
            where: { ID: UserID },
            relations: { AuthorizedApps: { Application: true } },
        });

        if (!MyUser) return res.status(404).json({ message: "User not found", code: JsonErrorCodes.UNKNOWN_USER });

        const OAuthApp = MyUser?.AuthorizedApps.find((R: OAuth2App) => R.Application.ID === req.params.ApplicationID);

        if (OAuthApp === undefined)
            return res
                .status(404)
                .json({ message: "Authorized Application not found", code: JsonErrorCodes.UNKNOWN_APPLICATION });

        const TokenCheck = bcrypt.compareSync(`${OAuthApp.ID}-${MyUser?.ID}`, Token.split("-")[1]);

        if (!TokenCheck)
            return res.status(404).json({ message: "Invalid Token", code: JsonErrorCodes.INVALID_OAUTH2_ACCESS_TOKEN });

        // generate a token for api and stuff ig

        const GeneratedOAuthToken = await GenerateOAuth2Token(OAuthApp.ID);
        res.json({ access_token: GeneratedOAuthToken });
    },
);


App.get("/:ApplicationID/discord/api/users/@me/guilds/:GuildID/member", VerifyOAuthReq, async (req, res) => {
    const MyUser = await GetUserByOAuthReq(req, { Memberships: { ToGuild: true } });

    if (!MyUser) return res.status(404).json({ message: "User not found", code: JsonErrorCodes.UNKNOWN_USER });

    const UserMembership = MyUser.Memberships.find((M) => M.ToGuild.ID === req.params.GuildID);

    if (UserMembership === undefined)
        return res.status(404).json({ message: "User not in guild", code: JsonErrorCodes.UNKNOWN_GUILD });

    res.json(UserMembership.Package());
});

App.get("/:ApplicationID/discord/api/users/@me/guilds/", VerifyOAuthReq, async (req, res) => {
    const MyUser = await GetUserByOAuthReq(req, { Memberships: { ToGuild: true } });

    if (!MyUser) return res.status(404).json({ message: "User not found", code: JsonErrorCodes.UNKNOWN_USER });

    const Guilds = MyUser.Memberships.map((M) => M.ToGuild.Partial());
    res.json(Guilds);
});

module.exports = {
    DefaultAPI: "/discordsays",
    App,
};
