import { DataSource } from "typeorm";
import { Msg } from "./Modules/Logger";

import "./Handlers/Server";
import "./Handlers/Gateway";
import "./Handlers/RTCSocket";

const UsePublicTestsDB = false;

export const DisprivDataSource = new DataSource({
    type: "sqlite",
    database: UsePublicTestsDB ? "Dispriv-TESTING.db" : "Dispriv.db",
    synchronize: true,
    logging: false,
    entities: [__dirname + "/Entities/*{.js,.ts}"],
    subscribers: [],
    migrations: []
}).initialize().then(() => Msg("Database initialized!", "Database"));