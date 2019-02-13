"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { truncate } from "lodash";
var v4_1 = __importDefault(require("uuid/v4"));
var tweetnacl_1 = require("tweetnacl");
var tweetnacl_util_1 = __importDefault(require("tweetnacl-util"));
var utils_1 = require("./utils");
var types_1 = require("mrdario-core/lib/api/types");
var log_1 = require("./utils/log");
var HighScoresModule_1 = require("./modules/HighScoresModule");
var auth_1 = require("mrdario-core/lib/api/types/auth");
function createUser(name) {
    var id = v4_1.default();
    var user = { name: name, id: id };
    var token = v4_1.default().slice(-10);
    var tokenBytes = tweetnacl_util_1.default.decodeUTF8(token);
    var tokenHashBytes = tweetnacl_1.hash(tokenBytes);
    var tokenHash = tweetnacl_util_1.default.encodeBase64(tokenHashBytes);
    return {
        clientUser: __assign({}, user, { token: token }),
        serverUser: __assign({}, user, { tokenHash: tokenHash })
    };
}
function authenticateUser(id, token, users) {
    if (!(id in users))
        return false;
    var serverUser = users[id];
    var tokenHash = tweetnacl_util_1.default.encodeBase64(tweetnacl_1.hash(tweetnacl_util_1.default.decodeUTF8(token)));
    return tokenHash === serverUser.tokenHash;
}
function bindSocketHandlers(socket, handlers) {
    for (var _i = 0, _a = Object.keys(handlers); _i < _a.length; _i++) {
        var eventType = _a[_i];
        //@ts-ignore
        socket.on(eventType, handlers[eventType]);
    }
}
function unbindSocketHandlers(socket, handlers) {
    for (var _i = 0, _a = Object.keys(handlers); _i < _a.length; _i++) {
        var eventType = _a[_i];
        socket.off(eventType, handlers[eventType]);
        delete handlers[eventType];
    }
}
var GameServer = /** @class */ (function () {
    function GameServer(scServer, rClient) {
        var _this = this;
        this.handleConnect = function (socket) {
            var connectionState = {
                lobbyHandlers: {}
            };
            log_1.logWithTime("Connected: ", utils_1.getClientIpAddress(socket));
            _this.highScores.handleConnect(socket);
            if (auth_1.hasAuthToken(socket)) {
                // revoke auth token if badly formatted, or if user is not in users collection
                if (!auth_1.isAuthToken(socket.authToken) || !(socket.authToken.id in _this.state.users)) {
                    socket.deauthenticate();
                }
                else {
                    log_1.logWithTime("Welcome back, " + socket.authToken.name);
                }
            }
            socket.on("disconnect", function () {
                log_1.logWithTime("Disconnected: ", utils_1.getClientIpAddress(socket));
                if (auth_1.hasValidAuthToken(socket) && socket.authToken.id in _this.state.users) {
                    log_1.logWithTime("Goodbye, ", socket.authToken.name);
                    delete _this.state.users[socket.authToken.id].socketId;
                }
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
            "login", function (request, respond) {
                var id = request.id, token = request.token, name = request.name;
                var clientUser;
                if (id && token && authenticateUser(id, token, _this.state.users)) {
                    // user is authenticated
                    // allow setting name at login
                    var serverUser = _this.state.users[id];
                    if (name != serverUser.name) {
                        _this.state.users[id].name = name;
                        _this.state.users[id].socketId = socket.id;
                    }
                    clientUser = { id: id, token: token, name: name };
                }
                else {
                    // authentication failed,
                    // or no id/token provided, create a new user
                    var created = createUser(name);
                    clientUser = created.clientUser;
                    var serverUser = created.serverUser;
                    _this.state.users[serverUser.id] = serverUser;
                    _this.state.users[serverUser.id].socketId = socket.id;
                }
                respond(null, clientUser);
                var authToken = { id: clientUser.id, name: clientUser.name };
                socket.setAuthToken(authToken);
                log_1.logWithTime(clientUser.name + " logged in. (" + clientUser.id + ")");
                console.table(Object.values(_this.state.users));
            });
            // @ts-ignore
            socket.on("leaveLobby", function (_data, respond) {
                if (auth_1.hasValidAuthToken(socket)) {
                    var error = null;
                    if (socket.authToken.id in _this.state.lobby) {
                        _this.leaveLobby(socket);
                    }
                    else {
                        error = new Error("You are not in the lobby");
                    }
                    unbindSocketHandlers(socket, connectionState.lobbyHandlers);
                    respond(error, null);
                }
            });
            // @ts-ignore
            socket.on("joinLobby", function (data, respond) {
                if (auth_1.hasValidAuthToken(socket)) {
                    var userId = socket.authToken.id;
                    var name_1 = socket.authToken.name;
                    if (userId in _this.state.lobby) {
                        // user already in lobby
                        var lobbyUser = _this.state.lobby[userId];
                        if (lobbyUser.sockets.indexOf(socket.id) >= 0) {
                            log_1.logWithTime(name_1 + " tried to re-join the lobby on the same socket");
                            // todo dont return error?
                            respond(new Error("You are already in the lobby"), null);
                            return;
                        }
                        else {
                            // add socket to existing lobby user
                            lobbyUser.sockets.push(socket.id);
                            log_1.logWithTime(name_1 + " joined the lobby in another socket");
                        }
                    }
                    else {
                        // user not in lobby - join
                        var lobbyUser = {
                            name: name_1,
                            id: userId,
                            joined: Date.now(),
                            sockets: [socket.id]
                        };
                        _this.state.lobby[userId] = lobbyUser;
                        var message = {
                            type: types_1.LobbyMessageType.Join,
                            payload: { name: name_1, id: userId, joined: lobbyUser.joined }
                        };
                        _this.scServer.exchange.publish("mrdario-lobby", message, function () { });
                        log_1.logWithTime(socket.authToken.name + " joined the lobby");
                    }
                    //shouldn't have any, but unbind old handlers to be safe
                    unbindSocketHandlers(socket, connectionState.lobbyHandlers);
                    connectionState.lobbyHandlers = {
                        disconnect: function () {
                            _this.leaveLobby(socket);
                        },
                        authenticate: function () {
                            // if user authenticates as a new user, old user should leave lobby
                            // todo new user should re-enter lobby too?
                            log_1.logWithTime(name_1 + " reauthenticated as " + socket.authToken.name + " - removing " + name_1 + " from lobby");
                            _this.leaveLobby(socket);
                        }
                    };
                    bindSocketHandlers(socket, connectionState.lobbyHandlers);
                    var lobbyUsers = Object.values(_this.state.lobby).map(function (user) {
                        var id = user.id, name = user.name, joined = user.joined;
                        return { id: id, name: name, joined: joined };
                    });
                    console.table(_this.state.lobby);
                    respond(null, lobbyUsers);
                }
                else {
                    respond(new Error("User is not authenticated - login first"), null);
                }
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
            lobby: {},
            games: {},
            channels: {},
            users: {}
        };
        this.highScores = new HighScoresModule_1.HighScoresModule(rClient);
        scServer.addMiddleware(scServer.MIDDLEWARE_PUBLISH_IN, function (req, next) {
            if (req.channel === "mrdario-lobby") {
                if (!auth_1.hasAuthToken(req.socket)) {
                    next(new Error("Invalid LobbyMessage"));
                    return;
                }
                var decoded = types_1.TLobbyMessage.decode(req.data);
                if (decoded.isRight()) {
                    console.log("it was a good message");
                    var value = decoded.value;
                    if (value.type === types_1.LobbyMessageType.ChatIn) {
                        var outMessage = __assign({}, value, { type: types_1.LobbyMessageType.ChatOut, userName: req.socket.authToken.name });
                        req.data = outMessage;
                    }
                    next();
                }
                else {
                    next(new Error("Invalid LobbyMessage"));
                }
            }
            else {
                next();
            }
        });
        scServer.on("connection", this.handleConnect);
    }
    GameServer.prototype.leaveLobby = function (socket) {
        var lobby = this.state.lobby;
        if (auth_1.hasAuthToken(socket)) {
            var authToken = socket.authToken;
            var userId = authToken.id, name_2 = authToken.name;
            if (authToken.id in lobby) {
                var user = lobby[userId];
                var sockets = user.sockets;
                var index = sockets.indexOf(socket.id);
                if (index >= 0) {
                    sockets.splice(index, 1);
                }
                if (sockets.length === 0) {
                    delete lobby[userId];
                    var message = {
                        type: types_1.LobbyMessageType.Leave,
                        payload: { name: user.name, id: user.id, joined: user.joined }
                    };
                    this.scServer.exchange.publish("mrdario-lobby", message, function () { });
                    log_1.logWithTime(name_2 + " left the lobby");
                    console.table(lobby);
                }
            }
        }
    };
    return GameServer;
}());
exports.GameServer = GameServer;
