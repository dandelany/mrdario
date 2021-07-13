"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PathReporter_1 = require("io-ts/lib/PathReporter");
const Either_1 = require("fp-ts/lib/Either");
function respondInvalidData(respond, message = "") {
    respond(`Invalid data sent with request: ${message}`, null);
}
exports.respondInvalidData = respondInvalidData;
function validateSocketData(data, TCodec, respond, successCallback, failureCallback = respondInvalidData) {
    const decoded = TCodec.decode(data);
    if (Either_1.isRight(decoded)) {
        successCallback(decoded.right, respond);
    }
    else {
        failureCallback(respond, PathReporter_1.PathReporter.report(decoded)[0]);
    }
}
exports.validateSocketData = validateSocketData;
function validateRequest(codec, successCallback, failureCallback = respondInvalidData) {
    return function validateRequestHandler(data, respond) {
        validateSocketData(data, codec, respond, successCallback, failureCallback);
    };
}
exports.validateRequest = validateRequest;
//# sourceMappingURL=io.js.map