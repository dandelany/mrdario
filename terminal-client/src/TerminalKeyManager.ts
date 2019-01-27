import { EventEmitter } from "events";
import * as blessed from "blessed";

import {
  GameControllerMode,
  GameInput,
  InputEventType,
  InputManager,
  KeyBindings,
  ModeKeyBindings
} from "mrdario-core/lib/types";


export default class TerminalKeyManager extends EventEmitter implements InputManager {
  mode: GameControllerMode;
  keyBindings: KeyBindings;
  screen: blessed.Widgets.Screen;
  private keyListeners: object;

  constructor(
    initialMode: GameControllerMode,
    keyBindings: KeyBindings,
    screen: blessed.Widgets.Screen
  ) {
    super();
    this.keyListeners = {};
    this.keyBindings = keyBindings;
    this.screen = screen;
    this.mode = initialMode;
    this.setMode(initialMode);
  }
  public setMode(mode: GameControllerMode) {
    if (this.mode) {
      this.unbindKeys();
    }
    this.bindModeKeys(mode);
    this.mode = mode;
  }
  private handleInput(inputType: GameInput) {
    super.emit(inputType, InputEventType.KeyDown);
    super.emit(inputType, InputEventType.KeyUp);
  }
  private bindModeKeys(mode: GameControllerMode) {
    if (!this.keyBindings[mode]) return;
    const modeBindings: ModeKeyBindings = this.keyBindings[mode] as ModeKeyBindings;
    for (const inputTypeStr of Object.keys(modeBindings)) {
      const inputType = inputTypeStr as GameInput;
      const keyStr = modeBindings[inputType] as string | string[];

      const listener = this.handleInput.bind(this, inputType);
      this.keyListeners[inputTypeStr] = { keyStr, listener };

      this.screen.key(keyStr, listener);
    }
  }
  private unbindKeys() {
    // todo
    for (const inputTypeStr of Object.keys(this.listeners)) {
      const { keyStr, listener } = this.keyListeners[inputTypeStr];
      this.screen.unkey(keyStr, listener);
    }
  }
}
