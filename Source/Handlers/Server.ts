import { green, italic } from "colorette";
import express from "express";
import fs from "fs";
import { Msg } from "../Modules/Logger";
import path from "path";
import cors from "cors";
import { handleError } from "../Modules/ValidationUtils";

export const Application = express()
    .disable("etag")
    .disable("x-powered-by")
    .use(cors({
        origin: "*"
    }))
    .use("*", express.json({
        limit: "5mb",
    }));

const LoadRoutes = async () => {
    const Files = fs
        .readdirSync(path.join(".", Symbol.for("ts-node.register.instance") in process ? "Source" : "bin", "Routes"))
        .filter((F) => F.endsWith(".js") || F.endsWith(".ts"));

    for (const File of Files) {
        const Contents = await import(path.join("..", "Routes", File));
        if (!Contents.default) continue;
        if (!Contents.default.App) continue;
        Application.use(Contents.default.DefaultAPI || "/", Contents.default.App);

        Msg(`Loaded route ${italic(File)}!`, "Gateway");
    }

    Application.use(
        "/discordsays",
        express.static(
            path.join(".", Symbol.for("ts-node.register.instance") in process ? "Source" : "bin", "Applications"),
        ),
    );

    Application.use(handleError); // Handles invalid json bodies and other errors

    Application.use((req, res) => res.status(404).json({ message: "404: Not Found", code: 0 }));
    
    Application.listen(process.env.PORT, () => Msg(`Application now listening on port ${green(process.env.PORT)}`));
};

LoadRoutes();
