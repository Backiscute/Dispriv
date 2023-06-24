import { Router } from "express";
import { VerifyAuth } from "../Modules/AuthUtils";
import { Gift } from "../Entities/Gift";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";

const App = Router();

App.get("/gift-codes/:code", VerifyAuth, async (req, res) => {
    const UserGift = await Gift.findOne({ where: { Code: req.params.code } });
    if (!UserGift) return res.json({ code: JsonErrorCodes.UnknownGiftCode, message: "Unknown Gift Code" });
    return res.json(UserGift.Package());
});

module.exports = {
    DefaultAPI: "/api/v9/entitlements",
    App,
};

