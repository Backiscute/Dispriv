import { DataSource } from "typeorm";
import "./Handlers/Server";
import "./Handlers/Gateway";
import "./Handlers/RTCSocket";

export const DisprivDataSource = new DataSource({
    type: "sqlite",
    database: "Dispriv.db",
    synchronize: false,
    logging: true,
    entities: [__dirname + "/Entities/*{.js,.ts}"],
    subscribers: [],
    migrations: []
}).initialize();