import { Router } from "express";

const App = Router();

App.get("/", async (req, res) => {
    res.json([]);
});

module.exports = {
    DefaultAPI: "/api/v9/outbound-promotions",
    App,
};