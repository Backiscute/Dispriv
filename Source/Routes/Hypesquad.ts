import { Router } from "express";
import { GetUserByRequest, VerifyAuth } from "../Modules/AuthUtils";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { HypesquadHouseJoinSchema } from "../Validators/Hypesquad";
import { UserFlags } from "../Classes/Flags";

const App = Router();

App.post("/online", VerifyAuth(false), ValidateRequest(HypesquadHouseJoinSchema), async (req, res) => {
    const User = await GetUserByRequest(req);
    if (!User) return res.sendStatus(400);

    const House = req.body.house_id; // 1-3
    const HYPESQUAD_FLAGS = [UserFlags.HYPESQUAD_BRAVERY, UserFlags.HYPESQUAD_BRILLIANCE, UserFlags.HYPESQUAD_BALANCE];

    if (House >= 1 && House <= 3) {
        User.Flags &= ~HYPESQUAD_FLAGS.reduce((a, b) => a | b); // remove all Hypesquad flags
        User.Flags |= HYPESQUAD_FLAGS[House - 1]; // add the selected Hypesquad flag
        User.Flags |= UserFlags.HYPESQUAD;
        await User.save();
    }

    res.sendStatus(204);
});

module.exports = {
    DefaultAPI: "/api/v9/hypesquad",
    App,
};
