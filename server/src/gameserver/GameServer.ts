import { SCServer, SCServerSocket } from "socketcluster-server";
import { SCChannel } from "sc-channel";
import { RedisClient } from "redis";
import uuid from "uuid/v4";

import { hasValidAuthToken } from "mrdario-core/lib/api/types";
import { GameListItem } from "mrdario-core/lib/api/types";

import { getClientIpAddress, socketInfoStr } from "./utils";
import { logWithTime } from "./utils/log";

import { HighScoresModule } from "./modules/highScores";
import { LobbyModule } from "./modules/lobby";
import { AuthModule } from "./modules/auth";
import { SyncModule } from "./modules/sync";

// in-memory state, for now...
// todo put this in redis where appropriate?

interface GameServerState {
  games: { [K in string]: GameListItem };
  channels: { [K in string]: SCChannel };
}

interface ConnectionState {
  game?: string;
}

export class GameServer {
  scServer: SCServer;
  rClient: RedisClient;
  // todo store in redis?
  state: GameServerState;

  highScores: HighScoresModule;
  lobby: LobbyModule;
  auth: AuthModule;
  sync: SyncModule;

  constructor(scServer: SCServer, rClient: RedisClient) {
    this.scServer = scServer;
    this.rClient = rClient;
    this.state = {
      games: {},
      channels: {}
    };

    // modules - the parts which actually handle requests and do things

    this.highScores = new HighScoresModule(rClient);
    this.lobby = new LobbyModule(scServer);
    this.auth = new AuthModule(scServer);
    this.sync = new SyncModule(scServer);

    scServer.on("connection", this.handleConnect);
  }

  protected handleConnect = (socket: SCServerSocket) => {
    const connectionState: ConnectionState = {};
    logWithTime("Connected: ", getClientIpAddress(socket));

    this.highScores.handleConnect(socket);
    this.lobby.handleConnect(socket);
    this.auth.handleConnect(socket);
    this.sync.handleConnect(socket);

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
