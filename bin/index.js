"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisprivDataSource = void 0;
const typeorm_1 = require("typeorm");
require("./Handlers/Server");
require("./Handlers/Gateway");
const User_1 = require("./entity/User");
exports.DisprivDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "Dispriv.db",
    synchronize: true,
    logging: false,
    entities: [User_1.User],
    subscribers: [],
    migrations: []
}).initialize();
