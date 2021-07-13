"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const scworker_1 = __importDefault(require("socketcluster/scworker"));
const express_1 = __importDefault(require("express"));
const serve_static_1 = __importDefault(require("serve-static"));
const path_1 = __importDefault(require("path"));
const morgan_1 = __importDefault(require("morgan"));
const sc_framework_health_check_1 = __importDefault(require("sc-framework-health-check"));
const redis_1 = __importDefault(require("redis"));
const GameServer_1 = require("./gameserver/GameServer");
const utils_1 = require("./gameserver/utils");
class Worker extends scworker_1.default {
    run() {
        console.log("   >> Worker PID:", process.pid);
        var environment = this.options.environment;
        var app = express_1.default();
        var httpServer = this.httpServer;
        var scServer = this.scServer;
        if (environment === "dev") {
            // Log every HTTP request.
            app.use(morgan_1.default("dev"));
        }
        app.use(serve_static_1.default(path_1.default.resolve(__dirname, "public")));
        // Add GET /health-check express route
        sc_framework_health_check_1.default.attach(this, app);
        httpServer.on("request", app);
        // initialize redis client for storage
        // use redis database 15 for testing, to avoid accidentally deleting prod/dev data
        const redisDB = (process.env.TEST_ENV) ? 15 : 0;
        var rClient = redis_1.default.createClient({ db: redisDB });
        rClient.on("error", function (err) {
            utils_1.logWithTime("Error " + err);
        });
        new GameServer_1.GameServer(scServer, rClient);
    }
}
new Worker();
//# sourceMappingURL=worker.js.map