import { DataSource } from "typeorm";
import "./Handlers/Server";
import "./Handlers/Gateway";
import { User } from "./entity/User";

export const DisprivDataSource = new DataSource({
    type: "sqlite",
    database: "Dispriv.db",
    synchronize: true,
    logging: false,
    entities: [User],
    subscribers: [],
    migrations: []
}).initialize();