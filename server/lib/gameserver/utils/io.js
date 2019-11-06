"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PathReporter_1 = require("io-ts/lib/PathReporter");
function respondInvalidData(respond, message = "") {
    respond(`Invalid data sent with request: ${message}`, null);
}
exports.respondInvalidData = respondInvalidData;
function validateSocketData(data, TCodec, respond, successCallback, failureCallback = respondInvalidData) {
    const decoded = TCodec.decode(data);
    if (decoded.isRight()) {
        successCallback(decoded.value, respond);
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