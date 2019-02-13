import { RedisClient } from "redis";
import { SCServer, SCServerSocket } from "socketcluster-server";
// import { truncate } from "lodash";
import uuid from "uuid/v4";
import { hash } from "tweetnacl";
import hashUtil from "tweetnacl-util";

import { getClientIpAddress, socketInfoStr } from "./utils";
import { SCChannel } from "sc-channel";
import {
  ClientAuthenticatedUser,
  LobbyChatMessageOut,
  LobbyJoinMessage,
  LobbyLeaveMessage,
  LobbyMessageType,
  LobbyResponse,
  LoginRequest,
  ServerUser,
  TLobbyMessage
} from "mrdario-core/lib/api/types";
import { logWithTime } from "./utils/log";
import { HighScoresModule } from "./modules/HighScoresModule";
import { AppAuthToken, hasAuthToken, hasValidAuthToken, isAuthToken } from "mrdario-core/lib/api/types/auth";

type GameListItem = {
  creator: string;
  level: number;
  speed: number;
};

// in-memory state, for now...
// todo put this in redis where appropriate?
type ServerUsers = { [K in string]: ServerUser };

type ServerLobbyUser = {
  name: string;
  id: string;
  joined: number;
  sockets: string[];
};

interface GameServerState {
  lobby: { [K in string]: ServerLobbyUser };
  games: { [K in string]: GameListItem };
  channels: { [K in string]: SCChannel };
  users: ServerUsers;
}

function createUser(name: string): { clientUser: ClientAuthenticatedUser; serverUser: ServerUser } {
  const id = uuid();
  const user = { name, id };
  const token = uuid().slice(-10);
  const tokenBytes = hashUtil.decodeUTF8(token);
  const tokenHashBytes = hash(tokenBytes);
  const tokenHash = hashUtil.encodeBase64(tokenHashBytes);
  return {
    clientUser: { ...user, token },
    serverUser: { ...user, tokenHash }
  };
}

function authenticateUser(id: string, token: string, users: ServerUsers) {
  if (!(id in users)) return false;
  const serverUser: ServerUser = users[id];
  const tokenHash = hashUtil.encodeBase64(hash(hashUtil.decodeUTF8(token)));
  return tokenHash === serverUser.tokenHash;
}

// const LOBBY_NAME = 'mrdario-lobby';
type SocketEventHandlers = { [K in string]: () => void };
interface ConnectionState {
  game?: string;
  lobbyHandlers: SocketEventHandlers;
}

function bindSocketHandlers(socket: SCServerSocket, handlers: { [k in string]: () => void }) {
  for (let eventType of Object.keys(handlers)) {
    //@ts-ignore
    socket.on(eventType, handlers[eventType]);
  }
}

function unbindSocketHandlers(socket: SCServerSocket, handlers: { [k in string]: () => void }) {
  for (let eventType of Object.keys(handlers)) {
    socket.off(eventType, handlers[eventType]);
    delete handlers[eventType];
  }
}

export class GameServer {
  scServer: SCServer;
  rClient: RedisClient;
  // todo store in redis?
  state: GameServerState;
  highScores: HighScoresModule;

  constructor(scServer: SCServer, rClient: RedisClient) {
    this.scServer = scServer;
    this.rClient = rClient;
    this.state = {
      lobby: {},
      games: {},
      channels: {},
      users: {}
    };
    this.highScores = new HighScoresModule(rClient);

    scServer.addMiddleware(
      scServer.MIDDLEWARE_PUBLISH_IN,
      (req: SCServer.PublishInRequest, next: SCServer.nextMiddlewareFunction) => {
        if(req.channel === 'mrdario-lobby') {
          if(!hasAuthToken(req.socket)) {
            next(new Error("Invalid LobbyMessage"));
            return;
          }
          const decoded = TLobbyMessage.decode(req.data);
          if(decoded.isRight()) {
            console.log('it was a good message');
            const value = decoded.value;
            if(value.type === LobbyMessageType.ChatIn) {
              const outMessage: LobbyChatMessageOut = {
                ...value,
                type: LobbyMessageType.ChatOut,
                userName: (req.socket.authToken as AppAuthToken).name
              };
              req.data = outMessage;
            }
            next();
          } else {
            next(new Error("Invalid LobbyMessage"))
          }
        } else {
          next();
        }
      }
    );

    scServer.on("connection", this.handleConnect);
  }

  protected leaveLobby(socket: SCServerSocket): void {
    const { lobby } = this.state;
    if (hasAuthToken(socket)) {
      const { authToken } = socket;
      const { id: userId, name } = authToken;
      if (authToken.id in lobby) {
        const user: ServerLobbyUser = lobby[userId];
        const sockets: string[] = user.sockets;
        const index = sockets.indexOf(socket.id);
        if (index >= 0) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          delete lobby[userId];
          const message: LobbyLeaveMessage = {
            type: LobbyMessageType.Leave,
            payload: { name: user.name, id: user.id, joined: user.joined }
          };
          this.scServer.exchange.publish("mrdario-lobby", message, () => {});
          logWithTime(`${name} left the lobby`);
          console.table(lobby);
        }
      }
    }
  }

  protected handleConnect = (socket: SCServerSocket) => {
    const connectionState: ConnectionState = {
      lobbyHandlers: {}
    };
    logWithTime("Connected: ", getClientIpAddress(socket));

    this.highScores.handleConnect(socket);

    if (hasAuthToken(socket)) {
      // revoke auth token if badly formatted, or if user is not in users collection
      if (!isAuthToken(socket.authToken) || !(socket.authToken.id in this.state.users)) {
        socket.deauthenticate();
      } else {
        logWithTime(`Welcome back, ${socket.authToken.name}`);
      }
    }

    socket.on("disconnect", () => {
      logWithTime("Disconnected: ", getClientIpAddress(socket));
      if (hasValidAuthToken(socket) && socket.authToken.id in this.state.users) {
        logWithTime("Goodbye, ", socket.authToken.name);
        delete this.state.users[socket.authToken.id].socketId;
      }

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
      logWithTime("ERROR ", err.name, err.message, ": ", socketInfoStr(socket));
    });

    socket.on(
      // @ts-ignore
      "login",
      (request: LoginRequest, respond: (err: Error | null, data: ClientAuthenticatedUser) => any): void => {
        const { id, token, name } = request;

        let clientUser: ClientAuthenticatedUser;
        if (id && token && authenticateUser(id, token, this.state.users)) {
          // user is authenticated
          // allow setting name at login
          const serverUser = this.state.users[id];
          if (name != serverUser.name) {
            this.state.users[id].name = name;
            this.state.users[id].socketId = socket.id;
          }
          clientUser = { id, token, name };
        } else {
          // authentication failed,
          // or no id/token provided, create a new user
          const created = createUser(name);
          clientUser = created.clientUser;
          const serverUser = created.serverUser;
          this.state.users[serverUser.id] = serverUser;
          this.state.users[serverUser.id].socketId = socket.id;
        }
        respond(null, clientUser);
        const authToken: AppAuthToken = { id: clientUser.id, name: clientUser.name };
        socket.setAuthToken(authToken);
        logWithTime(`${clientUser.name} logged in. (${clientUser.id})`);
        console.table(Object.values(this.state.users));
      }
    );

    // @ts-ignore
    socket.on("leaveLobby", (_data: null, respond: (err: Error | null, data: null) => any) => {
      if (hasValidAuthToken(socket)) {
        let error = null;
        if (socket.authToken.id in this.state.lobby) {
          this.leaveLobby(socket);
        } else {
          error = new Error("You are not in the lobby");
        }
        unbindSocketHandlers(socket, connectionState.lobbyHandlers);
        respond(error, null);
      }
    });

    // @ts-ignore
    socket.on("joinLobby", (data: null, respond: (err: Error | null, data: Lobby | null) => any) => {
      if (hasValidAuthToken(socket)) {
        const userId = socket.authToken.id;
        const name = socket.authToken.name;

        if (userId in this.state.lobby) {
          // user already in lobby
          const lobbyUser = this.state.lobby[userId];
          if (lobbyUser.sockets.indexOf(socket.id) >= 0) {
            logWithTime(`${name} tried to re-join the lobby on the same socket`);
            // todo dont return error?
            respond(new Error("You are already in the lobby"), null);
            return;
          } else {
            // add socket to existing lobby user
            lobbyUser.sockets.push(socket.id);
            logWithTime(`${name} joined the lobby in another socket`);
          }
        } else {
          // user not in lobby - join
          const lobbyUser: ServerLobbyUser = {
            name,
            id: userId,
            joined: Date.now(),
            sockets: [socket.id]
          };
          this.state.lobby[userId] = lobbyUser;
          const message: LobbyJoinMessage = {
            type: LobbyMessageType.Join,
            payload: { name: name, id: userId, joined: lobbyUser.joined }
          };
          this.scServer.exchange.publish("mrdario-lobby", message, () => {});
          logWithTime(`${socket.authToken.name} joined the lobby`);
        }

        //shouldn't have any, but unbind old handlers to be safe
        unbindSocketHandlers(socket, connectionState.lobbyHandlers);
        connectionState.lobbyHandlers = {
          disconnect: () => {
            this.leaveLobby(socket);
          },
          authenticate: () => {
            // if user authenticates as a new user, old user should leave lobby
            // todo new user should re-enter lobby too?
            logWithTime(`${name} reauthenticated as ${socket.authToken.name} - removing ${name} from lobby`);
            this.leaveLobby(socket);
          }
        };
        bindSocketHandlers(socket, connectionState.lobbyHandlers);

        const lobbyUsers: LobbyResponse = Object.values(this.state.lobby).map((user: ServerLobbyUser) => {
          const { id, name, joined } = user;
          return { id, name, joined };
        });
        console.table(this.state.lobby);

        respond(null, lobbyUsers);
      } else {
        respond(new Error("User is not authenticated - login first"), null);
      }
    });

    type CreateSimpleGameRequest = [number, number];
    // @ts-ignore
    socket.on("createSimpleGame", (data: CreateSimpleGameRequest, res) => {
      try {
        const gameListItem: GameListItem = {
          level: data[0],
          speed: data[1],
          creator: socket.id
        };
        const gameId = uuid().slice(-10);

        this.state.games[gameId] = gameListItem;
        connectionState.game = gameId;

        console.log("created game", gameId, gameListItem);

        const channelId = `game-${gameId}`;
        const channel = socket.exchange.subscribe(channelId);
        this.state.channels[channelId] = channel;
        channel.watch(data => {
          console.log(data);
        });

        res(null, gameId);
      } catch (e) {
        res(e);
      }
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
}
