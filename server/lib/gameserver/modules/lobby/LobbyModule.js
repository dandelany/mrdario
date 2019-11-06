"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lobby_1 = require("mrdario-core/lib/api/lobby");
const AbstractServerModule_1 = require("../../AbstractServerModule");
const utils_1 = require("../../utils");
class LobbyModule extends AbstractServerModule_1.AbstractServerModule {
    constructor(options) {
        super(options);
        this.state = { lobby: {} };
        this.addMiddleware(LobbyModule.config.channels);
    }
    handleConnect(socket) {
        const connectionState = {
            lobbyHandlers: {}
        };
        this.bindListener(socket, {
            eventType: lobby_1.LobbyEventType.Join,
            codec: lobby_1.TLobbyJoinRequest,
            listener: (_data, authToken, respond) => {
                const userId = authToken.id;
                const name = authToken.name;
                if (userId in this.state.lobby) {
                    // user already in lobby
                    const lobbyUser = this.state.lobby[userId];
                    if (lobbyUser.sockets.indexOf(socket.id) >= 0) {
                        utils_1.logWithTime(`${name} tried to re-join the lobby on the same socket`);
                        // todo dont return error?
                        respond(new Error("You are already in the lobby"), null);
                        return;
                    }
                    else {
                        // add socket to existing lobby user
                        lobbyUser.sockets.push(socket.id);
                        utils_1.logWithTime(`${name} joined the lobby in another socket`);
                    }
                }
                else {
                    // user not in lobby - join
                    const lobbyUser = {
                        name,
                        id: userId,
                        joined: Date.now(),
                        sockets: [socket.id]
                    };
                    this.state.lobby[userId] = lobbyUser;
                    const message = {
                        type: lobby_1.LobbyMessageType.Join,
                        payload: { name: name, id: userId, joined: lobbyUser.joined }
                    };
                    this.scServer.exchange.publish(lobby_1.LOBBY_CHANNEL_NAME, message, () => { });
                    utils_1.logWithTime(`${authToken.name} joined the lobby`);
                }
                //shouldn't have any, but unbind old handlers to be safe
                utils_1.unbindSocketHandlers(socket, connectionState.lobbyHandlers);
                connectionState.lobbyHandlers = {
                    disconnect: () => {
                        this.leaveLobby(socket);
                    },
                    authenticate: () => {
                        // if user authenticates as a new user, old user should leave lobby
                        // todo new user should re-enter lobby too?
                        utils_1.logWithTime(`${name} reauthenticated as ${authToken.name} - removing ${name} from lobby`);
                        this.leaveLobby(socket);
                    }
                };
                utils_1.bindSocketHandlers(socket, connectionState.lobbyHandlers);
                const lobbyUsers = Object.values(this.state.lobby).map((user) => {
                    const { id, name, joined } = user;
                    return { id, name, joined };
                });
                console.table(this.state.lobby);
                respond(null, lobbyUsers);
            }
        });
        this.bindListener(socket, {
            eventType: lobby_1.LobbyEventType.Leave,
            codec: lobby_1.TLobbyLeaveRequest,
            listener: (_data, authToken, respond) => {
                if (authToken.id in this.state.lobby) {
                    this.leaveLobby(socket);
                }
                else {
                    respond(new Error("You are not in the lobby"), null);
                }
                utils_1.unbindSocketHandlers(socket, connectionState.lobbyHandlers);
                respond(null, null);
            }
        });
    }
    leaveLobby(socket) {
        const { lobby } = this.state;
        if (utils_1.hasAuthToken(socket)) {
            const { authToken } = socket;
            const { id: userId, name } = authToken;
            if (authToken.id in lobby) {
                const user = lobby[userId];
                const sockets = user.sockets;
                const index = sockets.indexOf(socket.id);
                if (index >= 0) {
                    sockets.splice(index, 1);
                }
                if (sockets.length === 0) {
                    delete lobby[userId];
                    const message = {
                        type: lobby_1.LobbyMessageType.Leave,
                        payload: { name: user.name, id: user.id, joined: user.joined }
                    };
                    this.scServer.exchange.publish(lobby_1.LOBBY_CHANNEL_NAME, message, () => { });
                    utils_1.logWithTime(`${name} left the lobby`);
                    console.table(lobby);
                }
            }
        }
    }
}
exports.LobbyModule = LobbyModule;
LobbyModule.config = {
    channels: [
        AbstractServerModule_1.makeChannelConfig(
        // TLobbyResponse
        {
            name: lobby_1.LOBBY_CHANNEL_NAME,
            requireAuth: true,
            messageCodec: lobby_1.TLobbyMessage,
            publishInMiddleware: (req, next) => {
                console.log("lobby publish in");
                console.log(req.data);
                console.log(req.validData);
                const message = req.validData;
                if (message.type === lobby_1.LobbyMessageType.ChatIn) {
                    const outMessage = {
                        ...message,
                        type: lobby_1.LobbyMessageType.ChatOut,
                        // todo figure out typing for this so we don't use `as`
                        userName: req.socket.authToken.name
                    };
                    req.data = outMessage;
                    utils_1.logWithTime(`${outMessage.userName}: ${message.payload}`);
                }
                next();
            },
            publishOutMiddleware: (req, next) => {
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
//# sourceMappingURL=LobbyModule.js.map