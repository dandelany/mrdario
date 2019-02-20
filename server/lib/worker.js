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
Object.defineProperty(exports, "__esModule", { value: true });
var GameServer_1 = require("./gameserver/GameServer");
var SCWorker = require("socketcluster/scworker");
var express = require("express");
var serveStatic = require("serve-static");
var path = require("path");
var morgan = require("morgan");
var healthChecker = require("sc-framework-health-check");
// var {} = require('mrdario-')
var _ = require("lodash");
var redis = require("redis");
var randomWord = require("random-word-by-length");
var format = require("date-fns").format;
// var scoreUtils = require("./gameserver/modules/highScores/score");
function makeGameToken() {
    return Math.round(Math.random() * 1000000).toString(36);
}
function initSingleGame() {
    // const id = uuid.v4();
    var id = _.times(3, function () { return _.capitalize(randomWord(8)); }).join("");
    var token = makeGameToken();
    return { id: id, token: token };
}
function getClientIpAddress(socket) {
    return _.get(socket, "request.headers.x-forwarded-for", socket.remoteAddress);
}
function getSocketInfo(socket) {
    return {
        state: socket.state,
        ip: getClientIpAddress(socket),
        id: socket.id,
        ua: _.get(socket, "request.headers.user-agent", ""),
        time: Number(new Date())
    };
}
function socketInfoStr(socket) {
    return JSON.stringify(getSocketInfo(socket));
}
function logWithTime() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    console.log.apply(console, [format(new Date(), "MM-DD-YYYY HH:mm:ss")].concat(args));
}
var Worker = /** @class */ (function (_super) {
    __extends(Worker, _super);
    function Worker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Worker.prototype.run = function () {
        console.log("   >> Worker PID:", process.pid);
        var environment = this.options.environment;
        var app = express();
        var httpServer = this.httpServer;
        var scServer = this.scServer;
        if (environment === "dev") {
            // Log every HTTP request.
            app.use(morgan("dev"));
        }
        app.use(serveStatic(path.resolve(__dirname, "public")));
        // Add GET /health-check express route
        healthChecker.attach(this, app);
        httpServer.on("request", app);
        // initialize redis client for storage
        var rClient = redis.createClient();
        rClient.on("error", function (err) {
            logWithTime("Error " + err);
        });
        var gameServer = new GameServer_1.GameServer(scServer, rClient);
    };
    return Worker;
}(SCWorker));
new Worker();
