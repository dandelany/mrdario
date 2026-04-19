import { v4 as uuid } from "uuid";
import * as t from "io-ts";

import {
  CreateSingleGameRequest,
  CreateSingleGameResponse,
  GameEventType,
  SingleGameModeChangeMessage,
  SingleGameMoveMessage,
  TCreateSingleGameRequest,
  tSingleGameModeChangeMessage,
  tSingleGameMoveMessage,
  decodeTimedActions,
  encodeGameControllerState,
  encodeGrid
} from "mrdario-core/api";
import { encodeGameState } from "mrdario-core/api/game";
import { GameControllerMode } from "mrdario-core/game/controller";

import { ServerSingleGameController } from "./ServerSingleGameController.js";
import { defineServerModule } from "../../runtime/types.js";
import type { AuthenticatedModuleContext } from "../../runtime/types.js";

interface ServerGameState extends CreateSingleGameResponse {
  gameController: ServerSingleGameController;
}

type GameModuleState = {
  // all known single-player games by id
  games: { [k in string]: ServerGameState };
  // current single-player game "owned" by each live connection
  currentGameIdsByConnection: { [k in string]: string };
};

const state: GameModuleState = {
  games: {},
  currentGameIdsByConnection: {}
};

function getCurrentGame(connectionId: string): ServerGameState | undefined {
  const gameId = state.currentGameIdsByConnection[connectionId];
  if (!gameId) return undefined;
  return state.games[gameId];
}

export function createGameModule() {
  return defineServerModule({
    name: "game",
    onConnect: ({ connection }) => {
      // single-player game ownership is connection-scoped for now.
      // this is intentionally simple, but it means reconnect/continue flows need defensive handling.
      connection.on("disconnect", () => {
        delete state.currentGameIdsByConnection[connection.id];
      });
    },
    procedures: [
      {
        eventType: GameEventType.CreateSingle,
        auth: "required",
        codec: TCreateSingleGameRequest,
        handler: async (
          ctx: AuthenticatedModuleContext,
          options: CreateSingleGameRequest
        ): Promise<CreateSingleGameResponse> => {
          // create a fresh server-side controller for a new single-player session.
          const userId = ctx.authToken.id;
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
          state.games[gameId] = serverGame;
          // whichever game was current for this connection is now replaced by the newly-created one.
          state.currentGameIdsByConnection[ctx.connection.id] = gameId;
          return response;
        }
      },
      {
        eventType: GameEventType.SingleModeChange,
        auth: "required",
        codec: tSingleGameModeChangeMessage,
        handler: async (
          ctx: AuthenticatedModuleContext,
          nextMode: SingleGameModeChangeMessage
        ): Promise<null> => {
          // mode changes are applied to the caller's current single-player session only.
          console.log("mode change", nextMode);
          const serverGame = getCurrentGame(ctx.connection.id);
          if (serverGame) {
            const { gameController } = serverGame;
            const gameControllerState = gameController.getState();
            gameController.setState({
              ...gameControllerState,
              mode: nextMode as GameControllerMode
            });
            const encodedState = encodeGameControllerState(gameController.getState());
            console.log("emitting singleGameState", encodedState);
            ctx.connection.send("singleGameState", encodedState);
          }
          return null;
        }
      },
      {
        eventType: GameEventType.SingleMove,
        auth: "required",
        codec: tSingleGameMoveMessage,
        handler: async (ctx: AuthenticatedModuleContext, encodedMoves: SingleGameMoveMessage): Promise<null> => {
          const serverGame = getCurrentGame(ctx.connection.id);
          if (serverGame) {
            const { gameController, id } = serverGame;
            const timedMoveActions = decodeTimedActions(encodedMoves);
            console.log(timedMoveActions);
            const [actionFrame] = timedMoveActions;
            const currentState = gameController.getState();

            // after win/continue/restart flows, stale move packets can still arrive briefly.
            // ignore them rather than letting old history rewrite the new timeline.
            if (currentState.mode !== GameControllerMode.Playing) {
              console.warn(
                `ignoring singlemove while controller is ${currentState.mode} for game ${id} on connection ${ctx.connection.id}`
              );
              return null;
            }

            if (actionFrame < currentState.gameState.frame) {
              console.warn(
                `ignoring stale singlemove for past frame ${actionFrame} (current frame ${currentState.gameState.frame})`
              );
              return null;
            }

            gameController.addFrameActions(timedMoveActions);
            gameController.tickToFrame(actionFrame);
            const encodedState = encodeGameControllerState(gameController.getState());
            console.log("emitting singleGameState", encodeGrid(gameController.getState().gameState.grid, true));
            ctx.connection.send("singleGameState", encodedState);
            // keep the old game-${id} broadcast path for mirror/remote observers.
            await ctx.services.transport.publish(`game-${id}`, encodedState);
          }
          return null;
        }
      },
      {
        eventType: "GetSingleGameInfo",
        auth: "none",
        codec: t.string,
        handler: async (_ctx, gameId: string): Promise<CreateSingleGameResponse> => {
          // legacy request used by SingleRemoteGame to hydrate from a game id.
          const serverGame = state.games[gameId];
          if (!serverGame) {
            throw new Error(`could not find game ${gameId}`);
          }

          const { id, creator, gameOptions } = serverGame;
          return { id, creator, gameOptions };
        }
      }
    ]
  });
}
