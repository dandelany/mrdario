"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
__export(require("./auth"));
__export(require("./io"));
__export(require("./log"));
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
function bindSocketHandlers(socket, handlers) {
    for (var _i = 0, _a = Object.keys(handlers); _i < _a.length; _i++) {
        var eventType = _a[_i];
        //@ts-ignore
        socket.on(eventType, handlers[eventType]);
    }
}
exports.bindSocketHandlers = bindSocketHandlers;
function unbindSocketHandlers(socket, handlers) {
    for (var _i = 0, _a = Object.keys(handlers); _i < _a.length; _i++) {
        var eventType = _a[_i];
        socket.off(eventType, handlers[eventType]);
        delete handlers[eventType];
    }
}
exports.unbindSocketHandlers = unbindSocketHandlers;
// SCServer only exports these constants on a class instance
// convenient for typing reasons to have them as an enum
var SCMiddlewareType;
(function (SCMiddlewareType) {
    SCMiddlewareType["MIDDLEWARE_HANDSHAKE_WS"] = "handshakeWS";
    SCMiddlewareType["MIDDLEWARE_HANDSHAKE_SC"] = "handshakeSC";
    SCMiddlewareType["MIDDLEWARE_AUTHENTICATE"] = "authenticate";
    SCMiddlewareType["MIDDLEWARE_SUBSCRIBE"] = "subscribe";
    SCMiddlewareType["MIDDLEWARE_PUBLISH_IN"] = "publishIn";
    SCMiddlewareType["MIDDLEWARE_PUBLISH_OUT"] = "publishOut";
    SCMiddlewareType["MIDDLEWARE_EMIT"] = "emit";
})(SCMiddlewareType = exports.SCMiddlewareType || (exports.SCMiddlewareType = {}));
