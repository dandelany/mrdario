"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var server_1 = __importDefault(require("@ircam/sync/server"));
var startTime = process.hrtime();
exports.getTimeFunction = function () {
    var now = process.hrtime(startTime);
    return now[0] + now[1] * 1e-9;
};
// Module which maintains a synchronized clock between the client and server
// using @ircam/sync library
// todo - be less aggressive, don't send as many messages.
var SyncModule = /** @class */ (function () {
    function SyncModule(scServer) {
        this.scServer = scServer;
        this.syncServer = new server_1.default(exports.getTimeFunction);
    }
    SyncModule.prototype.handleConnect = function (socket) {
        var syncReceive = function (callback) {
            //@ts-ignore
            socket.on('sPing', function (data) {
                var pingId = data[0], clientPingTime = data[1];
                console.log("[ping] - pingId: %s, clientPingTime: %s", clientPingTime);
                callback(pingId, clientPingTime);
            });
        };
        var syncSend = function (pingId, clientPingTime, serverPingTime, serverPongTime) {
            console.log("[pong] - id: %s, clientPingTime: %s, serverPingTime: %s, serverPongTime: %s", pingId, clientPingTime, serverPingTime, serverPongTime);
            socket.emit('sPong', [pingId, clientPingTime, serverPingTime, serverPongTime]);
        };
        this.syncServer.start(syncSend, syncReceive);
    };
    return SyncModule;
}());
exports.SyncModule = SyncModule;
