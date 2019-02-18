import { SCServer, SCServerSocket } from "socketcluster-server";
import { SCChannel } from "sc-channel";
import { RedisClient } from "redis";
import uuid from "uuid/v4";
import { hash } from "tweetnacl";
import hashUtil from "tweetnacl-util";

import {
  AppAuthToken,
  ClientAuthenticatedUser,
  hasAuthToken,
  hasValidAuthToken,
  isAuthToken,
  LoginRequest,
  ServerUser
} from "mrdario-core/lib/api/types";

import { EventHandlersObj, getClientIpAddress, socketInfoStr } from "./utils";
import { logWithTime } from "./utils/log";

import { HighScoresModule } from "./modules/highScores";
import { LobbyModule } from "./modules/lobby";
// import {} from "./modules/Lo"

type GameListItem = {
  creator: string;
  level: number;
  speed: number;
};

// in-memory state, for now...
// todo put this in redis where appropriate?
type ServerUsers = { [K in string]: ServerUser };

interface GameServerState {
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

interface ConnectionState {
  game?: string;
  lobbyHandlers: EventHandlersObj;
}

export class GameServer {
  scServer: SCServer;
  rClient: RedisClient;
  // todo store in redis?
  state: GameServerState;
  highScores: HighScoresModule;
  lobby: LobbyModule;

  constructor(scServer: SCServer, rClient: RedisClient) {
    this.scServer = scServer;
    this.rClient = rClient;
    this.state = {
      games: {},
      channels: {},
      users: {}
    };
    // initialize modules - the parts which actually handle requests and do things
    this.highScores = new HighScoresModule(rClient);
    this.lobby = new LobbyModule(scServer);

    scServer.on("connection", this.handleConnect);
  }

  protected handleConnect = (socket: SCServerSocket) => {
    const connectionState: ConnectionState = {
      lobbyHandlers: {}
    };
    logWithTime("Connected: ", getClientIpAddress(socket));

    this.highScores.handleConnect(socket);
    this.lobby.handleConnect(socket);

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
