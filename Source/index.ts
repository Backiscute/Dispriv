import { DataSource } from "typeorm";
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
}).initialize()/*.then(async (d) => await d.query("PRAGMA foreign_keys=OFF"))*/;
