import { DataSource } from "typeorm";
import { Msg } from "./Modules/Logger";
import "./Handlers/Server";
import "./Handlers/Gateway";
import "./Handlers/RTCSocket";

export const DisprivDataSource = new DataSource({
    type: "sqlite",
    database: "Dispriv.db",
    synchronize: true,
    logging: false,
    entities: [__dirname + "/Entities/*{.js,.ts}"],
    subscribers: [],
    migrations: []
}).initialize().then(() => Msg("Database Initialized!", "Database"));