import { Router } from "express";
import { GenAccountErrorLogin, GenAccountErrorLoginAll } from "../Modules/ErrorUtils";
import { User } from "../Entities/User";
import bcrypt from "bcrypt";
import { GenerateToken } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Msg } from "../Modules/Logger";
import { Application } from "../Handlers/Server";
import { Presence } from "../Classes/Presence";

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
        return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Your email or password is incorrect.", res);

    if (LoginUser.Bot) return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Cannot login into a bot.", res);

    const PasswordCheck = bcrypt.compareSync(Password, LoginUser.Password);
    if (!PasswordCheck)
        return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Your email or password is incorrect.", res);

    const NewToken = GenerateToken(LoginUser.ID, Date.now(), LoginUser.Password);
    Msg(`User ${LoginUser.Username} logged in!`, "Auth");

    const Payload = { user_id: LoginUser.ID, token: NewToken, user_settings: { locale: LoginUser.Settings.locale, theme: LoginUser.Settings.theme } };

    // custom clients need this
    res.writeHead(200, { "Content-Type": "application/json" });
    res.write(JSON.stringify(Payload));
    res.end();
});

Application.get("/location-metadata", (req, res) => {
    res.json({
        consent_required: false,
        country_code: "US",
        promotional_email_opt_in: { required: false, pre_checked: false },
    });
});

module.exports = {
    DefaultAPI: "/api/v9/auth",
    App,
};
