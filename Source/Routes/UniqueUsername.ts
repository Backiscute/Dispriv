import { Router } from "express";
import { ValidateRequest } from "../Modules/ValidationUtils";
import { UsernameAvailableUnAuthedSchema } from "../Validators/UniqueUsername";

const App = Router();

App.post("/username-attempt-unauthed",ValidateRequest(UsernameAvailableUnAuthedSchema), async (req, res) => {
    res.sendStatus(200); // temp
});


module.exports = {
    DefaultAPI: "/api/v9/unique-username",
    App,
};