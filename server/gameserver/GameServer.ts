import { SCChannel } from "sc-channel";
import type { RedisClient } from "redis";

import { GameListItem } from "mrdario-core/api/game";

import { getClientIpAddress, socketInfoStr, logWithTime } from "./utils/index.js";
import { attachModule, createModuleContext, registerModuleTopics } from "./runtime/register.js";
import type { ClientConnection, ServerModuleDefinition, ServerServices, TransportRuntime } from "./runtime/types.js";
import { createHighScoresModule } from "./modules/scores/index.js";
import { createAuthModule } from "./modules/auth/index.js";
import { createLobbyModule } from "./modules/lobby/index.js";
import { createMatchModule } from "./modules/match/MatchModule.js";
import { createGameModule } from "./modules/game/GameModule.js";
import { createSyncModule } from "./modules/sync/index.js";

// top-level server orchestration.
// the point of this class is to wire shared services + transport into the module layer,
// not to own a bunch of socketcluster-specific behavior directly.

interface GameServerState {
  games: { [K in string]: GameListItem };
  channels: { [K in string]: SCChannel };
}

interface ConnectionState {
  game?: string;
}

export class GameServer {
  rClient: RedisClient;
  // todo store in redis?
  state: GameServerState;
  services: ServerServices;

  modularModules: ServerModuleDefinition[];

  constructor(transport: TransportRuntime, rClient: RedisClient) {
    this.rClient = rClient;
    this.state = {
      games: {},
      channels: {}
    };
    this.services = {
      redisClient: rClient,
      transport
    };

    this.services.transport.onPublishOut((req: any, next) => {
      // temporary transport-level logging while the new adapter settles down.
      // this should eventually be replaced by more intentional diagnostics.
      // console.log(req);
      console.log(req.socket.authToken);
      console.log(req.socket.id);
      console.log(req.channel);
      console.log(req.data);
      next(); // Allow
      // next(err); // Block with notice
      // next(true); // Block quietly (without raising a warning on the server-side)
    });

    // let msgI = 0;
    // setInterval(() => {
    //   this.scServer.exchange.publish("test-out-1", `1:T:test-out-1:${msgI}`);
    //   msgI++;
    // }, 2300);

    // modules declare procedures/topics in a transport-agnostic shape.
    // registration happens centrally so we can swap transports without rewriting module code.
    this.modularModules = [
      createHighScoresModule(),
      createAuthModule(),
      createLobbyModule(),
      createMatchModule(),
      createGameModule(),
      createSyncModule()
    ];
    this.modularModules.forEach(module => {
      registerModuleTopics(module, this.services);
    });

    transport.onConnection(this.handleConnect);
  }

  protected handleConnect = (connection: ClientConnection) => {
    const connectionState: ConnectionState = {};
    const moduleContext = createModuleContext(connection, this.services);
    const socket = connection.socket;
    logWithTime("Connected: ", getClientIpAddress(socket));
    logWithTime(socketInfoStr(socket));

    // attach all declared module behavior for this connection.
    this.modularModules.forEach(module => {
      attachModule(module, moduleContext);
    });

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
