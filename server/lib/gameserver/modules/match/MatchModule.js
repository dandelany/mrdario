"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var PathReporter_1 = require("io-ts/lib/PathReporter");
var lodash_1 = require("lodash");
var v4_1 = __importDefault(require("uuid/v4"));
var types_1 = require("mrdario-api/src/types");
var utils_1 = require("../../utils");
// interface Responder<T> {
//   (error: Error | string | true, data: null): void;
//   (error: null, data: T): void;
// }
//
// function requireAuthToken(
//   socket: SCServerSocket,
//   respond: (error: string, data: null) => void
// ): AppAuthToken | null {
//   if (hasValidAuthToken(socket)) {
//     return socket.authToken;
//   } else {
//     respond("User is not authenticated - login first", null);
//     return null;
//   }
// }
function respondNotAuthenticated(respond) {
    respond("User is not authenticated - login first", null);
}
function requireAuth(socket, respond, successCallback, failureCallback) {
    if (failureCallback === void 0) { failureCallback = respondNotAuthenticated; }
    if (utils_1.hasValidAuthToken(socket)) {
        successCallback(socket.authToken, respond);
    }
    else {
        failureCallback(respond);
    }
}
function createMatch(creatorId, options, playerCount) {
    if (playerCount === void 0) { playerCount = 2; }
    var defaultOptions = { invitationOnly: true, level: 10, baseSpeed: 15 };
    var fullOptions = lodash_1.defaults(options, defaultOptions);
    var invitationOnly = fullOptions.invitationOnly, level = fullOptions.level, baseSpeed = fullOptions.baseSpeed;
    var playerIds = __spreadArrays([creatorId], lodash_1.times(playerCount - 1, lodash_1.constant(null)));
    return {
        id: v4_1.default(),
        creatorId: creatorId,
        playerCount: playerCount,
        playerIds: playerIds,
        invitationOnly: invitationOnly,
        challengeToken: v4_1.default().slice(10),
        level: lodash_1.times(playerCount, lodash_1.constant(level)),
        baseSpeed: lodash_1.times(playerCount, lodash_1.constant(baseSpeed))
        // todo state?
    };
}
exports.createMatch = createMatch;
var MatchEventType;
(function (MatchEventType) {
    MatchEventType["CreateMatch"] = "CreateMatch";
    MatchEventType["JoinMatch"] = "JoinMatch";
})(MatchEventType = exports.MatchEventType || (exports.MatchEventType = {}));
var MatchModule = /** @class */ (function () {
    function MatchModule(scServer) {
        this.scServer = scServer;
    }
    MatchModule.prototype.handleConnect = function (socket) {
        // @ts-ignore
        // socket.on(MatchActionType.CreateMatch, (data: unknown, respond: SocketResponder<Match>) => {
        //   requireAuth(socket, respond, (authToken: AppAuthToken) => {
        //     validateSocketData(data, TCreateMatchRequest, respond, (request: CreateMatchRequest) => {
        //       const match: Match = createMatch(authToken.id, 2);
        //       respond(null, match);
        //     });
        //   });
        // });
        // @ts-ignore
        socket.on(MatchEventType.CreateMatch, authAndValidate(socket, types_1.TCreateMatchRequest, function (request, authToken, respond) {
            var match = createMatch(authToken.id, request, 2);
            console.log(match);
            respond(null, match);
        }));
    };
    return MatchModule;
}());
exports.MatchModule = MatchModule;
function authAndValidate(socket, TCodec, successCallback, failAuthCallback, failValidateCallback) {
    if (failAuthCallback === void 0) { failAuthCallback = respondNotAuthenticated; }
    if (failValidateCallback === void 0) { failValidateCallback = respondInvalidData; }
    return function authAndValidHandler(data, respond) {
        function authSuccess(authToken) {
            function validateSuccess(data) {
                successCallback(data, authToken, respond);
            }
            validateSocketData(data, TCodec, respond, validateSuccess, failValidateCallback);
        }
        requireAuth(socket, respond, authSuccess, failAuthCallback);
    };
}
function respondInvalidData(respond, message) {
    if (message === void 0) { message = ""; }
    respond("Invalid data sent with request: " + message, null);
}
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
// function authAndValidate<ExpectedType>(
//   socket: SCServerSocket,
//   data: unknown,
//   TCodec: t.Type<ExpectedType>,
//   respond: SocketResponder<any>,
//   successCallback: (data: ExpectedType, authToken: AppAuthToken, respond: SocketResponder<any>) => void,
//   failAuthCallback: (respond: SocketResponder<any>) => void = respondNotAuthenticated,
//   failValidateCallback: (respond: SocketResponder<any>, message: string) => void = respondInvalidData
// ) {
//   requireAuth(
//     socket,
//     respond,
//     authToken => {
//       validateSocketData(
//         data,
//         TCodec,
//         respond,
//         (data: ExpectedType) => {
//           successCallback(data, authToken, respond);
//         },
//         failValidateCallback
//       );
//     },
//     failAuthCallback
//   );
// }
