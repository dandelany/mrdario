import { GameInput, InputEventType } from "@/game/enums";
import { GameState } from "@/game";
import { ModeKeyBindings } from "@/game/types";

export enum GameControllerMode {
  Ready = "Ready",
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
  inputManagers: InputManager[];
  render: (state: GameControllerState, dt?: number) => any;
  onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => any;
  level: number;
  speed: number;
  height: number;
  width: number;
  fps: number;
  slow: number;
}

// todo figure out eventemitter
// interface InputManager extends EventEmitter {
export interface InputManager {
  setMode: (mode: GameControllerMode) => any;
  // on: (input: GameInput, callback: (inputType: GameInput, keyType: InputEventType, event: Event) => any) => any;
  on: (input: GameInput, callback: (keyType: InputEventType) => any) => any;
  removeAllListeners: () => any;
}

export type KeyBindings = { [M in GameControllerMode]?: ModeKeyBindings };
