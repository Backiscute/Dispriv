import { Router } from "express";
import { GenAccountErrorLogin, GenAccountErrorLoginAll } from "../Modules/ErrorUtils";
import { User } from "../Entities/User";
import bcrypt from "bcrypt";
import { GenerateMFAAuthToken, GenerateToken, GetTokenUserId, GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Msg } from "../Modules/Logger";
import { Presence } from "../Classes/Presence";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { MFAEnableSchema } from "../Validators/Users";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { TOTPAuthSchema } from "../Validators/Auth";
import crypto from "crypto";
import { verifyToken } from "node-2fa";

const App = Router();

App.get("/location-metadata", async (req, res) => {
    res.json({
        consent_required: false,
        country_code: "US",
        promotional_email_opt_in: { required: true, pre_checked: false },
    });
});

App.post("/register", async (req, res) => {
    const Email = req.body.email;
    const Username = req.body.username;
    const Password = req.body.password;
    const DOB = req.body.date_of_birth;

    if (!Email)
        return GenAccountErrorLogin(
            "DISPRIV_MISSING_PARAM",
            "Dispriv doesn't support your current parameters, use normal login if you are not using it yet.",
            res,
        );
    if (!Password)
        return GenAccountErrorLogin(
            "DISPRIV_MISSING_PARAM",
            "Dispriv doesn't support your current parameters, use normal login if you are not using it yet.",
            res,
        );
    if (!Username || Username.length > 32)
        return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "Invalid Username", res);
    if (!DOB) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing date of birth param", res);

    if (await User.findOneBy({ Email }))
        return GenAccountErrorLogin("DISPRIV_USER_EXISTS", "Email is already in use", res);

    Msg(`Registering user ${Username} with email ${Email}`, "Auth");

    const HashedPassword = bcrypt.hashSync(Password, 10);

    const NewUser = User.create({
        ID: GenerateSnowflake(),
        Email,
        Username,
        Bio: "Hey there! I am a new user on Dispriv!",
        Password: HashedPassword,
        DateOfBirth: new Date(DOB),
        TutorialReadIndicators: [],
        AuthorizedApps: [],
        Presence: Presence.ONLINE,
        Settings: {
            locale: "en-US",
            show_current_game: true,
            restricted_guilds: [],
            default_guilds_restricted: false,
            inline_attachment_media: true,
            inline_embed_media: true,
            gif_auto_play: true,
            render_embeds: true,
            render_reactions: true,
            animate_emoji: true,
            enable_tts_command: true,
            message_display_compact: false,
            convert_emoticons: true,
            explicit_content_filter: 0,
            disable_games_tab: false,
            theme: "dark",
            developer_mode: false,
            detect_platform_accounts: true,
            status: "online",
            afk_timeout: 600,
            timezone_offset: new Date().getTimezoneOffset(),
            stream_notifications_enabled: false,
            allow_accessibility_detection: false,
            contact_sync_enabled: true,
            custom_status: null,
            native_phone_integration_enabled: true,
            animate_stickers: 0,
            friend_discovery_flags: 0,
            view_nsfw_guilds: false,
            view_nsfw_commands: false,
            passwordless: false,
            friend_source_flags: {
                all: true
            },
            guild_folders: []
        }
    });

    try {
        await User.insert(NewUser);
    } catch (err) {
        if ((err as Error).cause === "USERNAME_TOO_MANY_USERS")
            return res.status(403).json({
                code: "USERNAME_TOO_MANY_USERS",
                message: (err as Error).message,
            });
        else throw err;
    }

    const NewToken = GenerateToken(NewUser.ID, Date.now(), HashedPassword);
    Msg(`Generated token ${NewToken} for user ${Username}, Registered`, "Auth");
    res.json({ token: NewToken });
});

App.post("/login", async (req, res) => {
    const Email = req.body.login;
    const Password = req.body.password;
    if (!Email) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing email or password param", res);
    if (!Password) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing email or password param", res);

    const LoginUser = await User.findOneBy({ Email });
    if (!LoginUser)
        return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Login or password is invalid.", res);

    if (LoginUser.Bot) return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Cannot login into a bot.", res);

    const PasswordCheck = bcrypt.compareSync(Password, LoginUser.Password);
    if (!PasswordCheck)
        return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Login or password is invalid.", res);

    if (LoginUser.MFAEnabled)
        return res.status(200).json({
            mfa: true,
            sms: false,
            user_id: LoginUser.ID,
            ticket: GenerateMFAAuthToken(LoginUser.ID, Date.now()),
            webauthn: null
        });

    const NewToken = GenerateToken(LoginUser.ID, Date.now(), LoginUser.Password);
    Msg(`User ${LoginUser.Username} logged in!`, "Auth");

    const Payload = { user_id: LoginUser.ID, token: NewToken, user_settings: { locale: LoginUser.Settings.locale, theme: LoginUser.Settings.theme } };

    // custom clients need this
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(Payload));
    res.end();
});

App.get("/location-metadata", (req, res) => {
    res.json({
        consent_required: false,
        country_code: "US",
        promotional_email_opt_in: { required: false, pre_checked: false },
    });
});

App.post("/verify/:Challenge", VerifyAuth(false), ValidateRequest(MFAEnableSchema), async (req, res) => {
    const Challenge = req.params.Challenge;
    const MyUser = await GetUserByRequest(req, { MFABackups: true });

    if (!MyUser) return res.status(400).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

    const PasswordCheck = bcrypt.compareSync(req.body.password, MyUser.Password);

    if (!PasswordCheck) return res.status(400).json({ message: "Password does not match", code: JsonErrorCodes.INVALID_FORM_BODY_OR_CONTENT_TYPE });

    switch (Challenge)
    {
        default:
            res.json({}); // temp
    }

});

App.post("/mfa/totp", ValidateRequest(TOTPAuthSchema), async (req, res) => {
    const MFACode = req.body.code;
    const Token = req.body.ticket;

    const Parts = Token.split(".");
    if (Parts.length !== 3) return res.status(400).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

    const UserID = GetTokenUserId(Token);

    const EncodedId = Parts[0];
    const EncodedTimestamp = Parts[1];

    const TUser = await User.findOne({ where: { ID: UserID }, relations: { MFABackups: true } });

    if (!TUser) return res.status(400).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });
    if (TUser.Bot) return res.status(400).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

    const Content = `${EncodedId}.${EncodedTimestamp}`;
    const Signature = crypto.createHmac("sha256", UserID).update(Content).digest("base64url");
    if (Parts[2] !== Signature) return res.status(400).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

    const MFASecret = TUser.MFASecret;

    if (!MFASecret) return res.status(400).json({ message: "Missing Access", code: JsonErrorCodes.MISSING_ACCESS });

    const Verify = verifyToken(MFASecret, MFACode);

    if (!Verify)
    {
        const MFABackups = TUser.MFABackups;

        if (!MFABackups) return res.status(400).json({ message: "Invalid two-factor code", code: JsonErrorCodes.INVALID_TWO_FACTOR_CODE });

        const Backup = MFABackups.find((x) => x.BackupCode === MFACode.replace(/-/g, ""));
        if (!Backup) return res.status(400).json({ message: "Invalid two-factor code", code: JsonErrorCodes.INVALID_TWO_FACTOR_CODE });
        if (Backup.Consumed) return res.status(400).json({ message: "Invalid two-factor code", code: JsonErrorCodes.INVALID_TWO_FACTOR_CODE });

        Backup.Consumed = true;

        await Backup.save();
    }

    const NewToken = GenerateToken(TUser.ID, Date.now(), TUser.Password);
    Msg(`User ${TUser.Username} logged in using 2FA!`, "Auth");

    const Payload = { user_id: TUser.ID, token: NewToken, user_settings: { locale: TUser.Settings.locale, theme: TUser.Settings.theme } };

    // custom clients need this
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(Payload));
    res.end();
});



module.exports = {
    DefaultAPI: "/api/v9/auth",
    App,
};
