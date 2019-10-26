"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PathReporter_1 = require("io-ts/lib/PathReporter");
var auth_1 = require("./auth");
;
function getChainedNext(i, middlewares, req, next) {
    if (i + 1 === middlewares.length) {
        return next;
    }
    else {
        return function proxiedNext(error) {
            // if there is an error, stop chaining and call next()
            if (error)
                next(error);
            // otherwise, call the next middleware
            var nextMiddleware = middlewares[i + 1];
            nextMiddleware(req, getChainedNext(i + 1, middlewares, req, next), next);
        };
    }
}
function chainMiddleware(middlewares) {
    return function chainedMiddleware(req, next) {
        // call each middleware in list in order
        // each gets a proxied next function which calls the real next(error) if an error is returned,
        // otherwise calls the next middleware in the list
        if (!middlewares.length) {
            next();
        }
        else {
            // todo rewrite to not use recursion?
            middlewares[0](req, getChainedNext(0, middlewares, req, next), next);
        }
    };
}
exports.chainMiddleware = chainMiddleware;
function requireAuthMiddleware(req, next) {
    if (!auth_1.hasValidAuthToken(req.socket)) {
        next(new Error(auth_1.NOT_AUTHENTICATED_MESSAGE));
    }
    else {
        next();
    }
}
exports.requireAuthMiddleware = requireAuthMiddleware;
function getValidateMiddleware(messageCodec) {
    return function validateMiddleware(req, next) {
        var decoded = messageCodec.decode(req.data);
        if (decoded.isRight()) {
            next();
        }
        else {
            next(new Error(PathReporter_1.PathReporter.report(decoded)[0]));
        }
    };
}
exports.getValidateMiddleware = getValidateMiddleware;
function validateChannelRequest(req, codec, callback, failCallback) {
    if (failCallback === void 0) { failCallback = function (e) { throw e; }; }
    var decoded = codec.decode(req.data);
    if (decoded.isRight()) {
        req.validData = decoded.value;
        var validReq = req;
        validReq.validData = decoded.value;
        callback(validReq);
    }
    else {
        failCallback(new Error(PathReporter_1.PathReporter.report(decoded)[0]));
    }
}
exports.validateChannelRequest = validateChannelRequest;
