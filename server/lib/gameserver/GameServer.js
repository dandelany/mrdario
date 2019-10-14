"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var v4_1 = __importDefault(require("uuid/v4"));
var utils_1 = require("./utils");
var auth_1 = require("./utils/auth");
var log_1 = require("./utils/log");
var highScores_1 = require("./modules/highScores");
var lobby_1 = require("./modules/lobby");
var auth_2 = require("./modules/auth");
var sync_1 = require("./modules/sync");
var MatchModule_1 = require("./modules/match/MatchModule");
var GameServer = /** @class */ (function () {
    function GameServer(scServer, rClient) {
        var _this = this;
        this.handleConnect = function (socket) {
            var connectionState = {};
            log_1.logWithTime("Connected: ", utils_1.getClientIpAddress(socket));
            _this.highScores.handleConnect(socket);
            _this.lobby.handleConnect(socket);
            _this.auth.handleConnect(socket);
            _this.sync.handleConnect(socket);
            _this.match.handleConnect(socket);
            socket.on("disconnect", function () {
                // temporary - remove below
                if (connectionState.game) {
                    delete _this.state.games[connectionState.game];
                    var channelId = "game-" + connectionState.game;
                    var channel = _this.state.channels[channelId];
                    if (channel) {
                        channel.unwatch();
                        delete _this.state.channels[channelId];
                    }
                }
            });
            socket.on("error", function (err) {
                log_1.logWithTime("ERROR ", err.name, err.message, ": ", utils_1.socketInfoStr(socket));
            });
            socket.on(
            // @ts-ignore
            "createSimpleGame", function (data, respond) {
                if (auth_1.hasValidAuthToken(socket)) {
                    var userId = socket.authToken.id;
                    // const name = socket.authToken.name;
                    try {
                        // const seed =
                        var gameListItem = {
                            id: v4_1.default().slice(-10),
                            initialSeed: v4_1.default().slice(-10),
                            level: data[0],
                            speed: data[1],
                            creator: userId
                        };
                        var gameId = v4_1.default().slice(-10);
                        _this.state.games[gameId] = gameListItem;
                        connectionState.game = gameId;
                        console.log("created game", gameId, gameListItem);
                        var channelId = "game-" + gameId;
                        var channel = socket.exchange.subscribe(channelId);
                        _this.state.channels[channelId] = channel;
                        channel.watch(function (data) {
                            console.log(data);
                        });
                        respond(null, gameListItem);
                    }
                    catch (e) {
                        respond(e, null);
                    }
                }
                else {
                    respond(new Error("User is not authenticated - login first"), null);
                }
            });
            //@ts-ignore
            socket.on("ping", function (data, res) {
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
        this.highScores = new highScores_1.HighScoresModule(rClient);
        this.lobby = new lobby_1.LobbyModule(scServer);
        this.auth = new auth_2.AuthModule(scServer);
        this.sync = new sync_1.SyncModule(scServer);
        this.match = new MatchModule_1.MatchModule(scServer);
        scServer.on("connection", this.handleConnect);
    }
    return GameServer;
}());
exports.GameServer = GameServer;
