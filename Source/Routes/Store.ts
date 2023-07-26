import { Router } from "express";
import { VerifyAuth } from "../Modules/AuthUtils";
import { SubscriptionPlan } from "../Entities/Gift";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { GiftPurchaseSchema } from "../Validators/Users";

const App = Router();

App.get("/published-listings/skus/:SKU/subscription-plans", VerifyAuth, async (req, res) => {
    const Plans = await SubscriptionPlan.find({ where: { SKUID: req.params.SKU } });

    if (Plans.length <= 0) return res.status(404).json({
        code: JsonErrorCodes.UNKNOWN_SKU,
        message: "Unknown SKU"
    });

    res.json(Plans.map((P) => P.Package()));
});

App.post("/skus/:SKU/purchase", VerifyAuth, async (req, res, next) => {
    ValidateRequest(req, res, next, GiftPurchaseSchema);
},
async (req, res) => {
    res.json({});
});

module.exports = {
    DefaultAPI: "/api/v9/store",
    App,
};