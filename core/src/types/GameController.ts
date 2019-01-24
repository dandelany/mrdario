import { GameControllerMode, GameGrid, InputManager, PillColors } from "./index";

export interface GameControllerState {
  mode: GameControllerMode;
  pillCount: number;
  grid: GameGrid;
  pillSequence: PillColors[];
  score: number;
  timeBonus: number;
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
