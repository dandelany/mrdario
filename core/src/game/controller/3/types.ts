import * as t from "io-ts";

import { strEnumType } from "../../../utils/io";

import { GameOptions, GameState, TimedGameActions, TimedGameTickResult } from "../../types";
import { Game } from "../../Game";
import { InputManager } from "../../input/types";
import { tTimedMoveActions } from "../../types/gameAction";


export enum GameController3Mode {
  // initialized but game & timer haven't started yet
  Ready = "Ready",
  // game is playing, game timer is ticking
  Playing = "Playing",
  //
  Pending = "Pending",
  Ended = "Ended"
  // TODO: countdown?
  // TODO: pause
}
export enum GameController3TimerType {
  //RequestAnimationFrame
  RequestAnimationFrame = "RAF",
  SetInterval = "SetInterval"
}

export interface GameController3Options {
  // number of players (ie. number of games)
  players: number;
  // indexes of local games ie. games played by this user/client
  localGames: number[],
  gameOptions: Partial<GameOptions>[];
  seed?: string;
  hasHistory: boolean;
  timerType: GameController3TimerType;
  timerFps: number;
  getTime: () => number;
  // each game may provide its own inputmanagers
  inputManagers: InputManager[][];
  render: (state: GameController3PublicState, dt?: number) => any;
  // todo what callbacks are needed? publish/subscribe?
  // onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => any;
  // onMoveActions?: (gameIndex: number, timedMoveActions: TimedMoveActions) => void;
  // onLocalAction?: (action: GameControllerAction) => void;
  // onRemoteAction?: (action: GameControllerAction) => void;
}

export interface GameController3State {
  mode: GameController3Mode;
  gameOptions: Partial<GameOptions>[];
  games: Game[];
  frame: number;
  refFrame: number;
  refTime: number;
  // these are [][]s because they have one array per game
  futureActions: TimedGameActions[][];
  actionHistory: TimedGameActions[][];
  stateHistory: GameState[][];
  initialGameStates: GameState[];
  resultHistory: TimedGameTickResult[][];
}
// public state returns game states rather than Game instances
export type GameController3PublicState = Omit<GameController3State, "games"> & {
  gameStates: GameState[];
};



export enum GameController3ClientActionType {
  // game moves from the player
  Moves = "Moves",
  // client believes game has been won or lost
  // might be rejected/superseded by remote moves made before game ended but not yet received
  // todo: should this be ClaimEnd instead of Win/Lose?
  ClaimWin = "ClaimWin",
  ClaimLose = "ClaimLose",
  // request to repeat missed message(s)
  Repeat = "Repeat"
}

export enum GameController3ServerActionType {
  // server can issue a new seed for the RNG for generating the next pill
  Seed = "Seed",
  // the game is over, server has declared a winner
  End = "End",
  // request (from server) to repeat missed message(s) from clients
  Repeat = "Repeat"

  /*
* start game?
* entire game state, in case user disconnects?
  * */
}

export enum GameControllerActionType {
  Settings = "Settings",
  Ready = "Ready",
  Start = "Start",
  Moves = "Moves",
  End = "End"

  // todo: seed, pause, resume
  // Pause = "Pause",
  // Resume = "Resume"
}
export const tGameControllerActionType = strEnumType<GameControllerActionType>(
  GameControllerActionType,
  "GameControllerActionType"
);

// Settings action
// May be sent by clients during GameControllerMode.Setup to modify their game settings
// ("game settings" are the subset of gameOptions that are user-modifiable)
export const tGameControllerSettingsAction = t.exact(
  t.type({
    type: t.literal(GameControllerActionType.Settings),
    player: t.number,
    settings: t.partial({
      level: t.number,
      baseSpeed: t.number
    })
  }),
  "GameControllerSettingsAction"
);
export type GameControllerSettingsAction = t.TypeOf<typeof tGameControllerSettingsAction>;

// Ready action
// Sent by all players (or clients in network game)
// to signal that they are done changing settings and ready to play the game
export const tGameControllerReadyAction = t.exact(
  t.type({
    type: t.literal(GameControllerActionType.Ready),
    player: t.number,
    ready: t.boolean
  }),
  "GameControllerReadyAction"
);
export type GameControllerReadyAction = t.TypeOf<typeof tGameControllerReadyAction>;

// Start action
// Fired internally (in local game) or sent by server (in network game)
// Game(s) will start as soon as this action is received
// todo: implement optional startTime or startDelay option for countdown?
export const tGameControllerStartAction = t.exact(
  t.type({
    type: t.literal(GameControllerActionType.Start)
  }),
  "GameControllerStartAction"
);
export type GameControllerStartAction = t.TypeOf<typeof tGameControllerStartAction>;

// Moves action
// Sent by players (or clients) to make moves in a game that is in Playing mode
export const tGameControllerMovesAction = t.exact(
  t.type({
    type: t.literal(GameControllerActionType.Moves),
    player: t.number,
    moves: tTimedMoveActions
  }),
  "GameControllerMovesAction"
);
export type GameControllerMovesAction = t.TypeOf<typeof tGameControllerMovesAction>;

// End action
// Fired internally (in local game) or sent by server (in network game)
export const tGameControllerEndAction = t.exact(
  t.type({
    type: t.literal(GameControllerActionType.End),
    // todo what else to send? final game states?
  })
);
export type GameControllerEndAction = t.TypeOf<typeof tGameControllerEndAction>;

export const tGameControllerAction = t.union(
  [
    tGameControllerSettingsAction,
    tGameControllerReadyAction,
    tGameControllerStartAction,
    tGameControllerMovesAction,
    tGameControllerEndAction
  ],
  "GameControllerAction"
);
export type GameControllerAction = t.TypeOf<typeof tGameControllerAction>;

// game controller actions:
//
// export type GameControllerAction {
//
// }
