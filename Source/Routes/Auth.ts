import { Router } from "express";
import { GenAccountErrorLogin, GenAccountErrorLoginAll } from "../Modules/ErrorUtils";
import { User } from "../Entities/User";
import bcrypt from "bcrypt";
import { GenerateToken } from "../Modules/AuthUtils";
import { GenerateSnowflake } from "../Modules/SnowflakeUtils";
import { Msg } from "../Modules/Logger";
import { Application } from "../Handlers/Server";

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

    if (!Email) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "Dispriv doesn't support your current parameters, use normal login if you are not using it yet.", res);
    if (!Password) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "Dispriv doesn't support your current parameters, use normal login if you are not using it yet.", res);
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
        Discriminator: "0000", //TODO
        TutorialReadIndicators: [],
        AuthorizedApps: []
    });

    await User.insert(NewUser);

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
    const PasswordCheck = bcrypt.compareSync(Password, LoginUser.Password);
    if (!PasswordCheck)
        return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Your email or password is incorrect.", res);

    const NewToken = GenerateToken(LoginUser.ID, Date.now(), LoginUser.Password);
    Msg(`User ${LoginUser.Username} logged in!`, "Auth");
    res.json({ token: NewToken, user_id: LoginUser.ID, user_settings: { locale: "en-US", theme: "dark" } }); // TODO: add user settings cuz i forgor
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
