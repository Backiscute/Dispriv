import { Router } from "express";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { UsernameAvailableUnAuthedSchema } from "../Validators/UniqueUsername";

const App = Router();

App.post("/username-attempt-unauthed", async (req, res, next) => {
    ValidateRequest(req, res, next, UsernameAvailableUnAuthedSchema);
},
async (req, res) => {
    res.sendStatus(200); // temp
});


module.exports = {
    DefaultAPI: "/api/v9/unique-username",
    App,
};