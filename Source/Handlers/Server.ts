import * as express from "express";
import * as env from "dotenv";

import * as fs from "fs";
import { Msg } from "../Modules/Logger";
env.config();

import chalk from "chalk";
import path from "path";

const PORT = parseInt(process.env.PORT) || 6969;

export const Application = express.default();
Application.disable("etag");
Application.disable("x-powered-by");

Application.use(
    express.json({
        limit: "5mb",
    })
);

Application.use("/discordsays", express.static(path.join(__dirname, "../Applications")));


const Files = fs.readdirSync("./bin/Routes");

(async () => {
    for (let I = 0; I < Files.length; I++) {
        const V = Files[I];

        if (!V.endsWith(".js")) continue;

        const Contents = await import(`../Routes/${V}`);
        if (!Contents.default.App) continue;
        Application.use(Contents.default.DefaultAPI || "/", Contents.default.App);

        Msg(`Loaded file ${chalk.italic(V)}!`);
    }

    Application.use((req, res) => res.status(404).json({ message: "404: Not Found", code: 0 }));

    Application.listen(PORT, () => Msg(`Application now listening on port ${chalk.green(PORT)}`));
})();
