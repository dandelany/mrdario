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
function logWithTime() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    // console.log(format(new Date(), 'MM-DD-YYYY HH:mm:ss'), ...args);
    // todo install date-fns
    console.log.apply(console, args);
}
exports.logWithTime = logWithTime;
