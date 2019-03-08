// import { GameInput, InputEventType } from "../enums";
// import { GameOptions, GameState } from "../Game";
// import { ModeKeyBindings } from "../types";

// export { GameControllerMode, GameControllerState, GameControllerOptions} from './GameController';
// export enum GameControllerMode {
//   Ready = "Ready",
//   Playing = "Playing",
//   Paused = "Paused",
//   Won = "Won",
//   Lost = "Lost",
//   Ended = "Ended"
// }

// export interface GameControllerState {
//   mode: GameControllerMode;
//   gameState: GameState;
// }

// export interface GameControllerOptions {
//   gameOptions: Partial<GameOptions>;
//   hasHistory: boolean;
//   getTime: () => number;
//   inputManagers: InputManager[];
//   render: (state: GameControllerState, dt?: number) => any;
//   onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => any;
// }

// todo figure out eventemitter
// interface InputManager extends EventEmitter {
// export interface InputManager {
//   setMode: (mode: GameControllerMode) => any;
//   // on: (input: GameInput, callback: (inputType: GameInput, keyType: InputEventType, event: Event) => any) => any;
//   on: (input: GameInput, callback: (keyType: InputEventType) => any) => any;
//   removeAllListeners: () => any;
// }

// export type KeyBindings = { [M in GameControllerMode]?: ModeKeyBindings };
