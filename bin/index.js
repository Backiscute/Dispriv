"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisprivDataSource = void 0;
const typeorm_1 = require("typeorm");
require("./Handlers/Server");
require("./Handlers/Gateway");
require("./Handlers/RTCSocket");
exports.DisprivDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "Dispriv.db",
    synchronize: true,
    logging: false,
    entities: [__dirname + "/Entities/*{.js,.ts}"],
    subscribers: [],
    migrations: []
}).initialize();
