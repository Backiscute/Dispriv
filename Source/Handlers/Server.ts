import { green, italic } from "colorette";
import express from "express";
import fs from "fs";
import { Msg } from "../Modules/Logger";

export const Application = express()
.disable("etag")
.disable("x-powered-by")
.use(express.json({
	limit: "5mb"
}));

const Files = fs.readdirSync("./bin/Routes");

(async () => {
    for (let I = 0; I < Files.length; I++) {
        const V = Files[I];
    
        if (!V.endsWith(".js")) continue;
    
        const Contents = await import(`../Routes/${V}`);
        if (!Contents.default.App) continue;
        Application.use(Contents.default.DefaultAPI || "/", Contents.default.App);
    
        Msg(`Loaded file ${italic(V)}!`);
    }
    
    Application.use((req, res) => res.status(404).json({"message": "404: Not Found", "code": 0}));

    Application.listen(process.env.PORT, () => Msg(`Application now listening on port ${green(process.env.PORT)}`));
    
})();
