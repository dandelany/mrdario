"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var t = __importStar(require("io-ts"));
exports.TAppAuthToken = t.type({
    id: t.string,
    name: t.string
});
function hasAuthToken(socket) {
    return socket.authState === socket.AUTHENTICATED && !!socket.authToken;
}
exports.hasAuthToken = hasAuthToken;
function hasValidAuthToken(socket) {
    return hasAuthToken(socket) && isAuthToken(socket.authToken);
}
exports.hasValidAuthToken = hasValidAuthToken;
function isAuthToken(authToken) {
    return (!!authToken &&
        typeof authToken.id === "string" &&
        !!authToken.id.length &&
        typeof authToken.name === "string");
}
exports.isAuthToken = isAuthToken;
