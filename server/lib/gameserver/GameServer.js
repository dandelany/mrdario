"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var v4_1 = __importDefault(require("uuid/v4"));
var utils_1 = require("./utils");
var score_1 = require("./utils/score");
var GameServer = /** @class */ (function () {
    function GameServer(scServer, rClient) {
        var _this = this;
        this.handleConnect = function (socket) {
            var connectionState = {};
            console.log(connectionState);
            utils_1.logWithTime("Connected: ", utils_1.getClientIpAddress(socket));
            // socket.on("hello", () => {})
            socket.on("disconnect", function () {
                utils_1.logWithTime("Disconnected: ", utils_1.getClientIpAddress(socket));
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
                utils_1.logWithTime("ERROR ", err.name, err.message, ": ", utils_1.socketInfoStr(socket));
            });
            // @ts-ignore
            socket.on("singleGameScore", function (data, res) {
                score_1.handleSingleScore(_this.rClient, data, function (err, rank, scoreInfo) {
                    if (err) {
                        res(err);
                        return;
                    }
                    if (scoreInfo) {
                        score_1.getSingleHighScores(_this.rClient, scoreInfo.level, 15, function (err, scores) {
                            // logWithTime('SCORE:', JSON.stringify({rank, scoreInfo, socket: getSocketInfo(socket)}), '\u0007');
                            utils_1.logWithTime(scoreInfo.name + " won on level " + scoreInfo.level + "! Score: " + scoreInfo.score + " (high score #" + (rank + 1) + ")", "\u0007");
                            res(err, { rank: rank, scores: scores });
                        });
                    }
                });
            });
            // @ts-ignore
            socket.on("getSingleHighScores", function (level, res) {
                console.log("getSingleHighScores", level);
                score_1.getSingleHighScores(_this.rClient, level, 50, function (err, scores) {
                    res(err, { level: level, scores: scores });
                });
            });
            // @ts-ignore
            socket.on("joinLobby", function (name, res) {
                var user = {
                    name: lodash_1.truncate(name, { length: 100 }),
                    id: v4_1.default(),
                    joined: Date.now()
                };
                _this.lobby.push(user);
                res(null, _this.lobby);
            });
            // @ts-ignore
            socket.on("createSimpleGame", function (data, res) {
                try {
                    var gameListItem = {
                        level: data[0],
                        speed: data[1],
                        creator: socket.id
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
                    res(null, gameId);
                }
                catch (e) {
                    res(e);
                }
            });
            //@ts-ignore
            socket.on('ping', function (data, res) {
                res(null, "pong");
            });
            // socket.on('infoStartGame', ([name, level, speed]) => {
            //   logWithTime(`${name} started level ${level} at speed ${speed}`);
            // })
            //
            // socket.on('infoLostGame', ([name, level, speed, score]) => {
            //   logWithTime(`${name} lost level ${level} at speed ${speed} (score ${score})`);
            // })
            // socket.on('moves', function (data) {
            //   console.log('got moves', data);
            // });
            //
            // socket.on('initSingleGame', () => {
            //   // const {id, token} = initSingleGame();
            //   // console.log('newSingleGame', id, token);
            //   // socket.emit('newSingleGame', {id, token});
            // });
        };
        this.scServer = scServer;
        this.rClient = rClient;
        this.lobby = [];
        this.state = {
            lobby: [],
            games: {},
            channels: {}
        };
        scServer.on("connection", this.handleConnect);
    }
    return GameServer;
}());
exports.GameServer = GameServer;
