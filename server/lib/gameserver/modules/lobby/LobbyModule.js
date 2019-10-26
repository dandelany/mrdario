"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var lobby_1 = require("mrdario-core/lib/api/lobby");
var AbstractServerModule_1 = require("../../AbstractServerModule");
var utils_1 = require("../../utils");
var middleware_1 = require("../../utils/middleware");
var LobbyModule = /** @class */ (function (_super) {
    __extends(LobbyModule, _super);
    function LobbyModule(options) {
        var _this = _super.call(this, options) || this;
        _this.state = { lobby: {} };
        _this.addMiddleware();
        return _this;
    }
    LobbyModule.prototype.addMiddleware = function () {
        var _this = this;
        LobbyModule.config.channels.forEach(function (channelConfig) {
            // const chainedPubInMiddleware = chainMiddleware<PublishInRequest>([
            //   (req, _next, end) => {
            //     if (req.channel !== LOBBY_CHANNEL_NAME) end();
            //   },
            //   requireAuthMiddleware,
            //   getValidateMiddleware(TLobbyMessage)
            // ])
            var messageCodec = channelConfig.messageCodec, publishInMiddleware = channelConfig.publishInMiddleware;
            _this.scServer.addMiddleware(_this.scServer.MIDDLEWARE_PUBLISH_IN, function (req, next) {
                if (req.channel === channelConfig.name) {
                    middleware_1.requireAuthMiddleware(req, function (e) {
                        if (e)
                            next(e);
                        else {
                            middleware_1.validateChannelRequest(req, messageCodec, function (validReq) {
                                if (publishInMiddleware)
                                    publishInMiddleware(validReq, next);
                                else
                                    next();
                            }, function (e) { return next(e); });
                        }
                    });
                }
                else {
                    next();
                }
            });
            if (channelConfig.publishOutMiddleware) {
                var publishOutMiddleware_1 = channelConfig.publishOutMiddleware;
                _this.scServer.addMiddleware(_this.scServer.MIDDLEWARE_PUBLISH_OUT, function (req, next) {
                    publishOutMiddleware_1(req, next);
                });
            }
        });
    };
    LobbyModule.prototype.handleConnect = function (socket) {
        var _this = this;
        var connectionState = {
            lobbyHandlers: {}
        };
        this.bindListener(socket, {
            eventType: lobby_1.LobbyEventType.Join,
            codec: lobby_1.TLobbyJoinRequest,
            listener: function (_data, authToken, respond) {
                var userId = authToken.id;
                var name = authToken.name;
                if (userId in _this.state.lobby) {
                    // user already in lobby
                    var lobbyUser = _this.state.lobby[userId];
                    if (lobbyUser.sockets.indexOf(socket.id) >= 0) {
                        utils_1.logWithTime(name + " tried to re-join the lobby on the same socket");
                        // todo dont return error?
                        respond(new Error("You are already in the lobby"), null);
                        return;
                    }
                    else {
                        // add socket to existing lobby user
                        lobbyUser.sockets.push(socket.id);
                        utils_1.logWithTime(name + " joined the lobby in another socket");
                    }
                }
                else {
                    // user not in lobby - join
                    var lobbyUser = {
                        name: name,
                        id: userId,
                        joined: Date.now(),
                        sockets: [socket.id]
                    };
                    _this.state.lobby[userId] = lobbyUser;
                    var message = {
                        type: lobby_1.LobbyMessageType.Join,
                        payload: { name: name, id: userId, joined: lobbyUser.joined }
                    };
                    _this.scServer.exchange.publish(lobby_1.LOBBY_CHANNEL_NAME, message, function () { });
                    utils_1.logWithTime(authToken.name + " joined the lobby");
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
                        utils_1.logWithTime(name + " reauthenticated as " + authToken.name + " - removing " + name + " from lobby");
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
        });
        this.bindListener(socket, {
            eventType: lobby_1.LobbyEventType.Leave,
            codec: lobby_1.TLobbyLeaveRequest,
            listener: function (_data, authToken, respond) {
                if (authToken.id in _this.state.lobby) {
                    _this.leaveLobby(socket);
                }
                else {
                    respond(new Error("You are not in the lobby"), null);
                }
                utils_1.unbindSocketHandlers(socket, connectionState.lobbyHandlers);
                respond(null, null);
            }
        });
    };
    LobbyModule.prototype.leaveLobby = function (socket) {
        var lobby = this.state.lobby;
        if (utils_1.hasAuthToken(socket)) {
            var authToken = socket.authToken;
            var userId = authToken.id, name_1 = authToken.name;
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
                        type: lobby_1.LobbyMessageType.Leave,
                        payload: { name: user.name, id: user.id, joined: user.joined }
                    };
                    this.scServer.exchange.publish(lobby_1.LOBBY_CHANNEL_NAME, message, function () { });
                    utils_1.logWithTime(name_1 + " left the lobby");
                    console.table(lobby);
                }
            }
        }
    };
    LobbyModule.config = {
        channels: [
            AbstractServerModule_1.makeChannelConfig(
            // TLobbyResponse
            {
                name: lobby_1.LOBBY_CHANNEL_NAME,
                requireAuth: true,
                messageCodec: lobby_1.TLobbyMessage,
                publishInMiddleware: function (req, next) {
                    console.log("lobby publish in");
                    console.log(req.data);
                    console.log(req.validData);
                    var message = req.validData;
                    if (message.type === lobby_1.LobbyMessageType.ChatIn) {
                        var outMessage = __assign(__assign({}, message), { type: lobby_1.LobbyMessageType.ChatOut, 
                            // todo figure out typing for this so we don't use `as`
                            userName: req.socket.authToken.name });
                        req.data = outMessage;
                        utils_1.logWithTime(outMessage.userName + ": " + message.payload);
                    }
                    next();
                },
                publishOutMiddleware: function (req, next) {
                    console.log("lobby publish out");
                    console.log(req.data);
                    if (req.data.type === lobby_1.LobbyMessageType.Join) {
                        console.log("joined", req.data.payload.name);
                    }
                    next();
                }
            })
        ]
    };
    return LobbyModule;
}(AbstractServerModule_1.AbstractServerModule));
exports.LobbyModule = LobbyModule;
