"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PathReporter_1 = require("io-ts/lib/PathReporter");
function respondInvalidData(respond, message) {
    if (message === void 0) { message = ""; }
    respond("Invalid data sent with request: " + message, null);
}
exports.respondInvalidData = respondInvalidData;
function validateSocketData(data, TCodec, respond, successCallback, failureCallback) {
    if (failureCallback === void 0) { failureCallback = respondInvalidData; }
    var decoded = TCodec.decode(data);
    if (decoded.isRight()) {
        successCallback(decoded.value, respond);
    }
    else {
        failureCallback(respond, PathReporter_1.PathReporter.report(decoded)[0]);
    }
}
exports.validateSocketData = validateSocketData;
function validateRequest(codec, successCallback, failureCallback) {
    if (failureCallback === void 0) { failureCallback = respondInvalidData; }
    return function validateRequestHandler(data, respond) {
        validateSocketData(data, codec, respond, successCallback, failureCallback);
    };
}
exports.validateRequest = validateRequest;
