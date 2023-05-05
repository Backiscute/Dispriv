"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
require("./Handlers/Server");
const User_1 = require("./entity/User");
const AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "Dispriv.db",
    synchronize: true,
    logging: false,
    entities: [User_1.User],
    subscribers: [],
    migrations: []
}).initialize();
