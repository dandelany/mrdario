"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const scores_1 = require("./modules/scores");
const lobby_1 = require("./modules/lobby");
const auth_1 = require("./modules/auth");
const sync_1 = require("./modules/sync");
const MatchModule_1 = require("./modules/match/MatchModule");
const GameModule_1 = require("./modules/game/GameModule");
;
class GameServer {
    constructor(scServer, rClient) {
        this.handleConnect = (socket) => {
            const connectionState = {};
            utils_1.logWithTime("Connected: ", utils_1.getClientIpAddress(socket));
            utils_1.logWithTime(utils_1.socketInfoStr(socket));
            Object.values(this.modules).forEach(module => {
                module.handleConnect(socket);
            });
            // this.highScores.handleConnect(socket);
            // this.lobby.handleConnect(socket);
            this.auth.handleConnect(socket);
            this.sync.handleConnect(socket);
            this.match.handleConnect(socket);
            socket.on("disconnect", () => {
                // temporary - remove below
                if (connectionState.game) {
                    delete this.state.games[connectionState.game];
                    const channelId = `game-${connectionState.game}`;
                    const channel = this.state.channels[channelId];
                    if (channel) {
                        channel.unwatch();
                        delete this.state.channels[channelId];
                    }
                }
            });
            socket.on("error", err => {
                utils_1.logWithTime("ERROR ", err.name, err.message, ": ", utils_1.socketInfoStr(socket));
            });
            //@ts-ignore
            socket.on("ping", (data, res) => {
                res(null, "pong");
            });
            // socket.on('infoStartGame', ([name, level, speed]) => {
            //   logWithTime(`${name} started level ${level} at speed ${speed}`);
            // })
            //
            // socket.on('infoLostGame', ([name, level, speed, score]) => {
            //   logWithTime(`${name} lost level ${level} at speed ${speed} (score ${score})`);
            // })
        };
        this.scServer = scServer;
        this.rClient = rClient;
        this.state = {
            games: {},
            channels: {}
        };
        // modules - the parts which actually handle requests and do things
        const moduleOpts = { scServer, rClient };
        this.modules = {
            highScores: new scores_1.HighScoresModule(moduleOpts),
            lobby: new lobby_1.LobbyModule(moduleOpts),
            game: new GameModule_1.GameModule(moduleOpts)
        };
        // this.highScores = new HighScoresModule({scServer, rClient});
        // this.lobby = new LobbyModule({scServer, rClient});
        this.auth = new auth_1.AuthModule(moduleOpts);
        this.sync = new sync_1.SyncModule(scServer);
        this.match = new MatchModule_1.MatchModule(scServer);
        scServer.on("connection", this.handleConnect);
    }
}
exports.GameServer = GameServer;
//# sourceMappingURL=GameServer.js.map