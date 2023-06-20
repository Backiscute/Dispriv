import { DataSource } from "typeorm";
import { Msg } from "./Modules/Logger";
import fs from "fs";

// dynamic import of all handlers
fs.readdirSync("Source/Handlers").map(async (File) => {
    await import(`./Handlers/${File.replace(".ts", ".js")}`);
    Msg(`Loaded handler ${File.replace(".ts", ".js")}!`, "Handlers");
});
const UsePublicTestsDB = false;

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
    .then(() => Msg("Database initialized!", "Database"));
