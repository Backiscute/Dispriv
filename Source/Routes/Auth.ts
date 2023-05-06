import { Router } from "express";
import { GenAccountErrorLogin, GenAccountErrorLoginAll } from "../Modules/ErrorUtils";
import { User } from "../entity/User";
import bcrypt from "bcrypt";
import { GenerateSnowflake, GenerateToken, VerifyToken } from "../Modules/SnowflakeUtils";
import { Msg } from "../Modules/Logger";


const App = Router();

App.post("/verifytoken", async (req, res) => {
    // test endpoint
    const Test = await VerifyToken(req.body.token);
    res.json({"passed": Test});  
});


App.post("/register", async (req, res) => {
    // TODO: Rework this
    const Email = req.body.email;
    const Username = req.body.username;
    const Password = req.body.password;
    const Date_of_birth = req.body.date_of_birth;
    
    if (!Email) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing email or password param", res);
    if (!Password) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing email or password param", res);
    if (!Username || Username.length > 32) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing username param", res);
    if (!Date_of_birth) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing date of birth param", res);

    if (await User.findOneBy({email: Email})) return GenAccountErrorLogin("DISPRIV_USER_EXISTS", "Email is already in use", res); // if better way exists fix thanks

    Msg(`Registering user ${Username} with email ${Email}`, "Auth");

    const HashedPassword = bcrypt.hashSync(Password, 10);
    
    const NewUser = User.create({
        id: GenerateSnowflake(),
        email: Email,
        username: Username,
        password: HashedPassword,
        date_of_birth: Date_of_birth,
        discriminator: "0000" //TODO
    });

    await NewUser.save();

    const NewToken = GenerateToken(NewUser.id, Date.now(), HashedPassword);
    Msg(`Generated token ${NewToken} for user ${Username}, Registered`, "Auth");
    res.json({"token": NewToken});  

});

App.post("/login", async (req, res) => {
    const Email = req.body.login;
    const Password = req.body.password;
    if (!Email) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing email or password param", res);
    if (!Password) return GenAccountErrorLogin("DISPRIV_MISSING_PARAM", "missing email or password param", res);

    const LoginUser = await User.findOneBy({email: Email});
    if (!LoginUser) return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Your email or password is incorrect.", res);
    const PasswordCheck = bcrypt.compareSync(Password, LoginUser.password);
    if (!PasswordCheck) return GenAccountErrorLoginAll("DISPRIV_INVALID_LOGIN", "Your email or password is incorrect.", res);

    const NewToken = GenerateToken(LoginUser.id, Date.now(), LoginUser.password);
    Msg(`User ${LoginUser.username} logged in!`, "Auth");
    res.json({"token": NewToken, "user_id": LoginUser.id, "user_settings": {"locale": "en-US", "theme": "dark"}}); // TODO: add user settings cuz i forgor
});

module.exports = {
    DefaultAPI: "/api/*/auth",
    App
};
