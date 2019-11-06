"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("@ircam/sync/server"));
const startTime = process.hrtime();
exports.getTimeFunction = () => {
    const now = process.hrtime(startTime);
    return now[0] + now[1] * 1e-9;
};
// Module which maintains a synchronized clock between the client and server
// using @ircam/sync library
// todo - be less aggressive, don't send as many messages.
class SyncModule {
    constructor(scServer) {
        this.scServer = scServer;
        this.syncServer = new server_1.default(exports.getTimeFunction);
    }
    handleConnect(socket) {
        const syncReceive = callback => {
            //@ts-ignore
            socket.on('sPing', (data) => {
                const [pingId, clientPingTime] = data;
                console.log(`[ping] - pingId: %s, clientPingTime: %s`, clientPingTime);
                callback(pingId, clientPingTime);
            });
        };
        const syncSend = (pingId, clientPingTime, serverPingTime, serverPongTime) => {
            console.log(`[pong] - id: %s, clientPingTime: %s, serverPingTime: %s, serverPongTime: %s`, pingId, clientPingTime, serverPingTime, serverPongTime);
            socket.emit('sPong', [pingId, clientPingTime, serverPingTime, serverPongTime]);
        };
        this.syncServer.start(syncSend, syncReceive);
    }
}
exports.SyncModule = SyncModule;
//# sourceMappingURL=SyncModule.js.map