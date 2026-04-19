import { GameControllerMode } from "../controller/index.js";
import { GameInput, InputEventType, ModeKeyBindings } from "../types/index.js";

export interface InputManager {
  setMode: (mode: GameControllerMode) => any;
  on: (event: "input", callback: (input: GameInput, keyType: InputEventType) => any) => any;
  removeAllListeners: () => any;
}

export type KeyBindings = { [M in GameControllerMode]?: ModeKeyBindings };
