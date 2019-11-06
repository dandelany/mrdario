import { SCServerSocket } from "socketcluster-server";
import uuid from "uuid/v4";
// import randomWord from "random-word-by-length";

import { AbstractServerModule, ServerModuleOptions } from "../../AbstractServerModule";
import {
  CreateSingleGameRequest,
  CreateSingleGameResponse,
  TCreateSingleGameRequest,
  GameEventType,
  SingleGameModeChangeMessage,
  tSingleGameModeChangeMessage,
  SingleGameMoveMessage,
  tSingleGameMoveMessage,
  decodeTimedActions,
  encodeGameControllerState,
  encodeGrid
} from "mrdario-core/src/api";
import { encodeGameState } from "mrdario-core/src/api/game";
import { ServerSingleGameController } from "./ServerSingleGameController";
import { GameControllerMode } from "mrdario-core/src";
import { SocketResponder } from "../../utils";
// import _ = require("lodash");

interface ServerGameState extends CreateSingleGameResponse {
  gameController: ServerSingleGameController;
}
type GameModuleState = {
  serverGame?: ServerGameState;
  // gameController?: ServerSingleGameController;
  games: { [k in string]: ServerGameState };
};
export class GameModule extends AbstractServerModule {
  state: GameModuleState;
  constructor(options: ServerModuleOptions) {
    super(options);
    this.state = {
      games: {}
    };
  }

  public handleConnect(socket: SCServerSocket): void {
    this.bindListener<CreateSingleGameRequest, CreateSingleGameResponse>(socket, {
      eventType: GameEventType.CreateSingle,
      codec: TCreateSingleGameRequest,
      listener: (options, authToken, respond) => {
        const userId = authToken.id;
        const { level, baseSpeed } = options;
        const initialSeed = uuid().slice(-10);
        const gameOptions = { level, baseSpeed, initialSeed };
        const gameId = uuid().slice(-10);

        const response: CreateSingleGameResponse = {
          id: gameId,
          creator: userId,
          gameOptions
        };
        const gameController = new ServerSingleGameController({
          gameOptions,
          hasHistory: true
        });

        console.log(response);
        console.log(gameController.getState());
        console.log(encodeGameState(gameController.getState().gameState));

        const serverGame: ServerGameState = {
          ...response,
          gameController
        };
        this.state.serverGame = serverGame;
        this.state.games[gameId] = serverGame;
        respond(null, response);
      }
    });

    this.bindListener<SingleGameModeChangeMessage, any>(socket, {
      eventType: GameEventType.SingleModeChange,
      codec: tSingleGameModeChangeMessage,
      listener: (nextMode: GameControllerMode) => {
        console.log("mode change", nextMode);
        if (this.state.serverGame) {
          const { serverGame } = this.state;
          const { gameController } = serverGame;
          const gameControllerState = gameController.getState();
          gameController.setState({
            ...gameControllerState,
            mode: nextMode
          });
          // console.log(gameController.getState());
          const encodedState = encodeGameControllerState(gameController.getState());
          console.log("emitting singleGameState", encodedState);
          socket.emit("singleGameState", encodedState);
        }
      }
    });

    this.bindListener<SingleGameMoveMessage, any>(socket, {
      eventType: GameEventType.SingleMove,
      codec: tSingleGameMoveMessage,
      listener: (encodedMoves: string) => {
        // console.log('move', encodedMoves);
        if (this.state.serverGame) {
          const { serverGame } = this.state;
          const { gameController, id } = serverGame;
          const timedMoveActions = decodeTimedActions(encodedMoves);
          // console.log(timedMoveActions);
          console.log(timedMoveActions);
          gameController.addFrameActions(timedMoveActions);
          const actionFrame = timedMoveActions[0];
          gameController.tickToFrame(actionFrame);
          const encodedState = encodeGameControllerState(gameController.getState());
          // console.log('emitting singleGameState', encodedState);
          console.log("emitting singleGameState", encodeGrid(gameController.getState().gameState.grid, true));
          socket.emit("singleGameState", encodedState);
          this.scServer.exchange.publish(`game-${id}`, encodedState);
        }
      }
    });

    socket.on("GetSingleGameInfo", (gameId: string, respond: SocketResponder<any>) => {
      const serverGame = this.state.games[gameId];
      if (serverGame) {
        const { id, creator, gameOptions } = serverGame;
        respond(null, { id, creator, gameOptions });
      } else {
        respond("Could not find game " + gameId , null);
      }
    });
  }
}
