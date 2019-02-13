"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
function getClientIpAddress(socket) {
    return lodash_1.get(socket, "request.headers.x-forwarded-for", socket.remoteAddress);
}
exports.getClientIpAddress = getClientIpAddress;
function getSocketInfo(socket) {
    return {
        state: socket.state,
        ip: getClientIpAddress(socket),
        id: socket.id,
        ua: lodash_1.get(socket, "request.headers.user-agent", ""),
        time: Number(new Date())
    };
}
exports.getSocketInfo = getSocketInfo;
function socketInfoStr(socket) {
    return JSON.stringify(getSocketInfo(socket));
}
exports.socketInfoStr = socketInfoStr;
