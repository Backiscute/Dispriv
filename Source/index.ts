import env from "dotenv";
env.config();
import { DataSource } from "typeorm";
import { Msg } from "./Modules/Logger";
import fs from "fs";
import path from "path";
import { italic } from "colorette";
import { DiscordApplication } from "./Entities/Application";
import { CreateDefaultSubscriptions } from "./Modules/DiscordUtils";

// dynamic import of all handlers
async function LoadHandlers() {
    const Files = fs
        .readdirSync(path.join(".", Symbol.for("ts-node.register.instance") in process ? "Source" : "bin", "Handlers"))
        .filter((F) => F.endsWith(".js") || F.endsWith(".ts"));
    for await (const File of Files) {
        await import(`./Handlers/${File}`);

        Msg(`Loaded handler ${italic(File)}!`, "Handlers");
    }
}

async function SubscriptionCheck() {
    const NitroApp = await DiscordApplication.findOne({ where: { ID: "521842831262875670" } });

    if (NitroApp) return;

    Msg("Creating Default Subscriptions!", "Database");

    CreateDefaultSubscriptions();
}

const UsePublicTestsDB = true;
export const DisprivDataSource = new DataSource({
    type: "sqlite",
    database: UsePublicTestsDB ? "Dispriv-TESTING.db" : "Dispriv.db",
    synchronize: true,
    logging: false,
    entities: [__dirname + "/Entities/*{.js,.ts}"],
    subscribers: [],
    migrations: [],
})
    .initialize()
    .then(() => {
        Msg("Database initialized!", "Database");
        LoadHandlers();
        SubscriptionCheck();
    });