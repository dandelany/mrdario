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
var lodash_1 = require("lodash");
var v4_1 = __importDefault(require("uuid/v4"));
var match_1 = require("mrdario-core/lib/api/match");
var utils_1 = require("../../utils");
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
var MatchModule = /** @class */ (function () {
    function MatchModule(scServer) {
        this.scServer = scServer;
    }
    MatchModule.prototype.handleConnect = function (socket) {
        // @ts-ignore
        socket.on(match_1.MatchEventType.CreateMatch, utils_1.authAndValidateRequest(socket, match_1.TCreateMatchRequest, function (request, authToken, respond) {
            var match = createMatch(authToken.id, request, 2);
            console.log(match);
            respond(null, match);
        }));
    };
    return MatchModule;
}());
exports.MatchModule = MatchModule;
