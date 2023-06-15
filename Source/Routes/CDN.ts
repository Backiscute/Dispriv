import { Router } from "express";
import { existsSync, readFileSync } from "fs";
import path from "path";

const App = Router();

App.get("/icons/:GuildID/:FileName", (req, res) => {
	if (!/^[a-z0-9.]+$/g.test(req.params.FileName))
		return res.status(403).json({ code: 0, message: "nuh uh" });

	if (!existsSync(path.join(__dirname + `\\..\\Assets/${req.params.FileName.split(".")[0]}.png`)))
		return res.status(404).send();

	res.set("content-type", "image/png");
	res.send(readFileSync(path.join(__dirname + `\\..\\Assets/${req.params.FileName.split(".")[0]}.png`)).toString());
});

module.exports = {
    DefaultAPI: "/cdn",
    App
};