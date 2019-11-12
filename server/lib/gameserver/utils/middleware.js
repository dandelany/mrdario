"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PathReporter_1 = require("io-ts/lib/PathReporter");
const auth_1 = require("./auth");
const Either_1 = require("fp-ts/lib/Either");
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
            const nextMiddleware = middlewares[i + 1];
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
        const decoded = messageCodec.decode(req.data);
        if (Either_1.isRight(decoded)) {
            next();
        }
        else {
            next(new Error(PathReporter_1.PathReporter.report(decoded)[0]));
        }
    };
}
exports.getValidateMiddleware = getValidateMiddleware;
function validateChannelRequest(req, codec, callback, failCallback = (e) => { throw e; }) {
    const decoded = codec.decode(req.data);
    if (Either_1.isRight(decoded)) {
        req.validData = decoded.right;
        const validReq = req;
        validReq.validData = decoded.right;
        callback(validReq);
    }
    else {
        failCallback(new Error(PathReporter_1.PathReporter.report(decoded)[0]));
    }
}
exports.validateChannelRequest = validateChannelRequest;
//# sourceMappingURL=middleware.js.map