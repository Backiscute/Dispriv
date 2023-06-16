import { Router } from "express";
import { existsSync, readFileSync } from "fs";
import path from "path";

const App = Router();

App.get([
	"/icons/*/:FileName",
	"/avatars/*/:FileName"
], (req, res) => {
	if (!/^[a-z0-9.]+$/g.test(req.params.FileName))
		return res.status(403).json({ code: 0, message: "nuh uh" });

	console.log(req.params.FileName);

	if (!existsSync(path.join(__dirname + `\\..\\Assets/${req.params.FileName}`)))
		return res.status(404).send();

	res.writeHead(200, { "Content-Type": "image/webp" });
	res.write(readFileSync(path.join(__dirname + `\\..\\Assets/${req.params.FileName}`)));
	res.end();
});

module.exports = {
    DefaultAPI: "/cdn",
    App
};