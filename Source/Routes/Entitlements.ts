import { Router } from "express";
import { VerifyAuth } from "../Modules/AuthUtils";
import { Gift } from "../Entities/Gift";
import { JsonErrorCodes } from "../Classes/JsonOpCodes";

const App = Router();

App.get("/gift-codes/:code", VerifyAuth, async (req, res) => {
    const UserGift = await Gift.findOne({ where: { Code: req.params.code }, relations: { SKU: true, User: true } });
    if (!UserGift) return res.json({ code: JsonErrorCodes.UnknownGiftCode, message: "Unknown Gift Code" });
    // res.json({
    //     code: req.params.code,
    //     sku_id: "521847234246082599",
    //     application_id: "521842831262875670",
    //     uses: 69,
    //     max_uses: 150000,
    //     expires_at: "999-99-99T99:99:99+99:99",
    //     redeemed: false,
    //     user: {
    //         id: "805530068860403742",
    //         username: "mc",
    //         avatar: null,
    //         discriminator: "1337",
    //         public_flags: 0,
    //     },
    //     store_listing: {
    //         id: "521848044908576803",
    //         summary: " ",
    //         sku: {
    //             id: "521847234246082599",
    //             type: 5,
    //             dependent_sku_id: null,
    //             application_id: "521842831262875670",
    //             manifest_labels: null,
    //             access_type: 1,
    //             name: "Nitro",
    //             features: [],
    //             release_date: null,
    //             premium: false,
    //             slug: "nitro",
    //             flags: 68,
    //             show_age_gate: false,
    //         },
    //         thumbnail: {
    //             id: "633877574094684160",
    //             size: 148981,
    //             mime_type: "image/png",
    //             width: 556,
    //             height: 316,
    //         },
    //     },
    //     subscription_plan_id: "511651880837840896",
    //     subscription_plan: {
    //         id: "511651880837840896",
    //         name: "Nitro Monthly",
    //         interval: 1,
    //         interval_count: 1,
    //         tax_inclusive: true,
    //         sku_id: "521847234246082599",
    //         currency: "usd",
    //         price: 999,
    //         price_tier: null,
    //     },
    // });
    res.json(UserGift.Package());
});

module.exports = {
    DefaultAPI: "/api/v9/entitlements",
    App,
};
