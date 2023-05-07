import { Router } from "express";
import { User } from "../Entities/User";
import { VerifyToken } from "../Modules/SnowflakeUtils";

const App = Router();

// a
App.post("/UpdateUser/:Username", async (req, res) => {
    const UserData = await User.findOneBy({
        Username: req.params.Username
    });
    if (!UserData) return;

    Object.keys(req.body).forEach(K => {
        UserData[K] = req.body[K];
    });

    await UserData.save();
    res.send(UserData);
});

App.post("/verifytoken", async (req, res) => {
    const Test = await VerifyToken(req.body.token);
    res.json({ passed: Test });
});

module.exports = {
    DefaultAPI: "/api/tests",
    App
};