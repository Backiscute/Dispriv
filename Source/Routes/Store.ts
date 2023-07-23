import { Router } from "express";
import { VerifyAuth } from "../Modules/AuthUtils";
import { SubscriptionPlan } from "../Entities/Gift";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";

const App = Router();

App.get("/published-listings/skus/:SKU/subscription-plans", VerifyAuth, async (req, res) => {
    const Plans = await SubscriptionPlan.find({ where: { SKUID: req.params.SKU } });

    if (Plans.length <= 0) return res.status(404).json({
        code: JsonErrorCodes.UNKNOWN_SKU,
        message: "Unknown SKU"
    });

    res.json(Plans.map((P) => P.Package()));
});

module.exports = {
    DefaultAPI: "/api/v9/store",
    App,
};