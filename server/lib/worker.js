"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var scworker_1 = __importDefault(require("socketcluster/scworker"));
var express_1 = __importDefault(require("express"));
var serve_static_1 = __importDefault(require("serve-static"));
var path_1 = __importDefault(require("path"));
var morgan_1 = __importDefault(require("morgan"));
var sc_framework_health_check_1 = __importDefault(require("sc-framework-health-check"));
var redis_1 = __importDefault(require("redis"));
var GameServer_1 = require("./gameserver/GameServer");
var utils_1 = require("./gameserver/utils");
var Worker = /** @class */ (function (_super) {
    __extends(Worker, _super);
    function Worker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Worker.prototype.run = function () {
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
        // var rClient = redis.createClient();
        var rClient = redis_1.default.createClient({ db: 15 });
        rClient.on("error", function (err) {
            utils_1.logWithTime("Error " + err);
        });
        new GameServer_1.GameServer(scServer, rClient);
    };
    return Worker;
}(scworker_1.default));
new Worker();
