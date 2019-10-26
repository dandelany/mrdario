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
var io_1 = require("./io");
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
exports.NOT_AUTHENTICATED_MESSAGE = "User is not authenticated - login first";
function respondNotAuthenticated(respond) {
    respond(exports.NOT_AUTHENTICATED_MESSAGE, null);
}
exports.respondNotAuthenticated = respondNotAuthenticated;
function requireAuth(socket, respond, successCallback, failureCallback) {
    if (failureCallback === void 0) { failureCallback = respondNotAuthenticated; }
    if (hasValidAuthToken(socket)) {
        successCallback(socket.authToken, respond);
    }
    else {
        failureCallback(respond);
    }
}
exports.requireAuth = requireAuth;
function authAndValidateRequest(socket, TCodec, successCallback, failAuthCallback, failValidateCallback) {
    if (failAuthCallback === void 0) { failAuthCallback = respondNotAuthenticated; }
    if (failValidateCallback === void 0) { failValidateCallback = io_1.respondInvalidData; }
    return function authAndValidHandler(data, respond) {
        function authSuccess(authToken) {
            function validateSuccess(data) {
                successCallback(data, authToken, respond);
            }
            io_1.validateSocketData(data, TCodec, respond, validateSuccess, failValidateCallback);
        }
        requireAuth(socket, respond, authSuccess, failAuthCallback);
    };
}
exports.authAndValidateRequest = authAndValidateRequest;
