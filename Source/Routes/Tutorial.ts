import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";

const App = Router();

App.post("/indicators/suppress", VerifyAuth, async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const User = (await GetUserByRequest(req))!;

    User.TutorialSuppressed = true;
    await User.save();

    res.sendStatus(204);
});

App.put("/indicators/:indicatorName", VerifyAuth, async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const User = (await GetUserByRequest(req))!;
    const Indicator = req.params.indicatorName;

    if (User.TutorialReadIndicators.includes(Indicator)) return res.sendStatus(204);

    User.TutorialReadIndicators.push(Indicator);
    await User.save();

    res.sendStatus(204);
});

module.exports = {
    DefaultAPI: "/api/v9/tutorial",
    App
};