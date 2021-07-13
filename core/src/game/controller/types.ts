import * as t from "io-ts";
import { strEnumType } from "../../utils/io";
import { InputManager } from "../input/types";
import { GameOptions, GameState} from "../types";
import { TimedMoveActions, tTimedMoveActions } from "../types/gameAction";

export enum GameControllerMode {
  Setup = "Setup",
  Ready = "Ready",
  Countdown = "Countdown",
  Playing = "Playing",
  Paused = "Paused",
  Won = "Won",
  Lost = "Lost",
  Ended = "Ended"
}

export interface GameControllerState {
  mode: GameControllerMode;
  gameState: GameState;
}

export interface GameControllerOptions {
  gameOptions: Partial<GameOptions>;
  hasHistory: boolean;
  getTime: () => number;
  inputManagers: InputManager[];
  render: (state: GameControllerState, dt?: number) => any;
  onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => any;
  onMoveActions?: (timedMoveActions: TimedMoveActions) => void;
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
