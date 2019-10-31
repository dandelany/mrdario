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
} from "mrdario-core/lib/api";
import { encodeGameState } from "mrdario-core/lib/api/game";
import { ServerSingleGameController } from "./ServerSingleGameController";
import { GameControllerMode } from "mrdario-core";
// import _ = require("lodash");

type GameModuleState = {
  gameController?: ServerSingleGameController;
};
export class GameModule extends AbstractServerModule {
  state: GameModuleState;
  constructor(options: ServerModuleOptions) {
    super(options);
    this.state = {};
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

        const response: CreateSingleGameResponse = {
          id: uuid().slice(-10),
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

        this.state.gameController = gameController;
        respond(null, response);
      }
    });

    this.bindListener<SingleGameModeChangeMessage, any>(socket, {
      eventType: GameEventType.SingleModeChange,
      codec: tSingleGameModeChangeMessage,
      listener: (nextMode: GameControllerMode) => {
        console.log("mode change", nextMode);
        if (this.state.gameController) {
          const { gameController } = this.state;
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
        if (this.state.gameController) {
          const { gameController } = this.state;
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
        }
      }
    });
  }
}
