import { SCServer, SCServerSocket } from "socketcluster-server";
import { SCChannel } from "sc-channel";
import { RedisClient } from "redis";
import uuid from "uuid/v4";

import { GameListItem } from "mrdario-core/lib/api/game";

import { getClientIpAddress, socketInfoStr } from "./utils";
import { hasValidAuthToken } from "./utils/auth";
import { logWithTime } from "./utils/log";

import { HighScoresModule } from "./modules/scores";
import { LobbyModule } from "./modules/lobby";
import { AuthModule } from "./modules/auth";
import { SyncModule } from "./modules/sync";
import { MatchModule } from "./modules/match/MatchModule";
import { AbstractServerModule } from "./AbstractServerModule";

// in-memory state, for now...
// todo put this in redis where appropriate?

interface GameServerState {
  games: { [K in string]: GameListItem };
  channels: { [K in string]: SCChannel };
}

interface ConnectionState {
  game?: string;
}

interface ServerModule extends AbstractServerModule {};

export class GameServer {
  scServer: SCServer;
  rClient: RedisClient;
  // todo store in redis?
  state: GameServerState;

  modules: {[k in string]: ServerModule};

  // highScores: HighScoresModule;
  // lobby: LobbyModule;
  auth: AuthModule;
  sync: SyncModule;
  match: MatchModule;

  constructor(scServer: SCServer, rClient: RedisClient) {
    this.scServer = scServer;
    this.rClient = rClient;
    this.state = {
      games: {},
      channels: {}
    };

    // modules - the parts which actually handle requests and do things
    const moduleOpts = {scServer, rClient};
    this.modules = {
      highScores: new HighScoresModule(moduleOpts),
      lobby: new LobbyModule(moduleOpts)
    };
    // this.highScores = new HighScoresModule({scServer, rClient});
    // this.lobby = new LobbyModule({scServer, rClient});
    this.auth = new AuthModule(moduleOpts);
    this.sync = new SyncModule(scServer);
    this.match = new MatchModule(scServer);

    scServer.on("connection", this.handleConnect);
  }

  protected handleConnect = (socket: SCServerSocket) => {
    const connectionState: ConnectionState = {};
    logWithTime("Connected: ", getClientIpAddress(socket));
    logWithTime(socketInfoStr(socket));

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
      logWithTime("ERROR ", err.name, err.message, ": ", socketInfoStr(socket));
    });

    type CreateSimpleGameRequest = [number, number];

    socket.on(
      // @ts-ignore
      "createSimpleGame",
      (data: CreateSimpleGameRequest, respond: (err: Error | null, game: GameListItem | null) => void) => {
        if (hasValidAuthToken(socket)) {
          const userId = socket.authToken.id;
          // const name = socket.authToken.name;

          try {
            // const seed =
            const gameListItem: GameListItem = {
              id: uuid().slice(-10),
              initialSeed: uuid().slice(-10),
              level: data[0],
              speed: data[1],
              creator: userId
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

            respond(null, gameListItem);
          } catch (e) {
            respond(e, null);
          }
        } else {
          respond(new Error("User is not authenticated - login first"), null);
        }
      }
    );

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
