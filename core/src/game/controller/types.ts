import { InputManager } from "../input/types";
import { GameOptions } from "../types";
import { GameState, TimedMoveActions } from "../types";

export enum GameControllerMode {
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
