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
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("mrdario-core/lib/api/types");
var utils_1 = require("../../utils");
var log_1 = require("../../utils/log");
var LOBBY_CHANNEL_NAME = 'mrdario-lobby';
var LobbyModule = /** @class */ (function () {
    function LobbyModule(scServer) {
        this.scServer = scServer;
        this.state = {
            lobby: {}
        };
        this.addMiddleware();
    }
    LobbyModule.prototype.addMiddleware = function () {
        this.scServer.addMiddleware(this.scServer.MIDDLEWARE_PUBLISH_IN, function (req, next) {
            if (req.channel === LOBBY_CHANNEL_NAME) {
                if (!types_1.hasAuthToken(req.socket)) {
                    next(new Error("Invalid LobbyMessage"));
                    return;
                }
                var decoded = types_1.TLobbyMessage.decode(req.data);
                if (decoded.isRight()) {
                    var value = decoded.value;
                    if (value.type === types_1.LobbyMessageType.ChatIn) {
                        var outMessage = __assign({}, value, { type: types_1.LobbyMessageType.ChatOut, userName: req.socket.authToken.name });
                        req.data = outMessage;
                        log_1.logWithTime(outMessage.userName + ": " + value.payload);
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
    };
    LobbyModule.prototype.handleConnect = function (socket) {
        var _this = this;
        var connectionState = {
            lobbyHandlers: {}
        };
        // @ts-ignore
        socket.on("joinLobby", function (data, respond) {
            if (types_1.hasValidAuthToken(socket)) {
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
                    _this.scServer.exchange.publish(LOBBY_CHANNEL_NAME, message, function () { });
                    log_1.logWithTime(socket.authToken.name + " joined the lobby");
                }
                //shouldn't have any, but unbind old handlers to be safe
                utils_1.unbindSocketHandlers(socket, connectionState.lobbyHandlers);
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
                utils_1.bindSocketHandlers(socket, connectionState.lobbyHandlers);
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
        socket.on("leaveLobby", function (_data, respond) {
            if (types_1.hasValidAuthToken(socket)) {
                var error = null;
                if (socket.authToken.id in _this.state.lobby) {
                    _this.leaveLobby(socket);
                }
                else {
                    error = new Error("You are not in the lobby");
                }
                utils_1.unbindSocketHandlers(socket, connectionState.lobbyHandlers);
                respond(error, null);
            }
        });
    };
    LobbyModule.prototype.leaveLobby = function (socket) {
        var lobby = this.state.lobby;
        if (types_1.hasAuthToken(socket)) {
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
                    this.scServer.exchange.publish(LOBBY_CHANNEL_NAME, message, function () { });
                    log_1.logWithTime(name_2 + " left the lobby");
                    console.table(lobby);
                }
            }
        }
    };
    return LobbyModule;
}());
exports.LobbyModule = LobbyModule;
