import { DataSource } from "typeorm";
import "./Handlers/Server";
import { User } from "./entity/User";

const AppDataSource = new DataSource({
    type: "sqlite",
    database: "Dispriv.db",
    synchronize: true,
    logging: false,
    entities: [User], // temp
    subscribers: [],
    migrations: []
}).initialize();