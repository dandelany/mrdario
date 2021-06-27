// import { GameControllerMode } from "../controller";
import { GameControllerMode } from "../controller";
import { GameInput, InputEventType, ModeKeyBindings } from "../types";

export interface InputManager {
  setMode: (mode: GameControllerMode) => any;
  on: (event: "input", callback: (input: GameInput, keyType: InputEventType) => any) => any;
  removeAllListeners: () => any;
}

export type KeyBindings = { [M in GameControllerMode]?: ModeKeyBindings };
