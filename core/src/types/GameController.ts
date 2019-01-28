import { GameControllerMode, InputManager } from "./index";
import { GameState } from "../Game";

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
