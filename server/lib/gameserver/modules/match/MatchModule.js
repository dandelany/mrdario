"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const v4_1 = __importDefault(require("uuid/v4"));
const match_1 = require("mrdario-core/lib/api/match");
const utils_1 = require("../../utils");
function createMatch(creatorId, options, playerCount = 2) {
    const defaultOptions = { invitationOnly: true, level: 10, baseSpeed: 15 };
    const fullOptions = lodash_1.defaults(options, defaultOptions);
    const { invitationOnly, level, baseSpeed } = fullOptions;
    const playerIds = [creatorId, ...lodash_1.times(playerCount - 1, lodash_1.constant(null))];
    return {
        id: v4_1.default(),
        creatorId,
        playerCount,
        playerIds,
        invitationOnly,
        challengeToken: v4_1.default().slice(10),
        level: lodash_1.times(playerCount, lodash_1.constant(level)),
        baseSpeed: lodash_1.times(playerCount, lodash_1.constant(baseSpeed))
        // todo state?
    };
}
exports.createMatch = createMatch;
class MatchModule {
    constructor(scServer) {
        this.scServer = scServer;
    }
    handleConnect(socket) {
        // @ts-ignore
        socket.on(match_1.MatchEventType.CreateMatch, utils_1.authAndValidateRequest(socket, match_1.TCreateMatchRequest, (request, authToken, respond) => {
            const match = createMatch(authToken.id, request, 2);
            console.log(match);
            respond(null, match);
        }));
    }
}
exports.MatchModule = MatchModule;
//# sourceMappingURL=MatchModule.js.map