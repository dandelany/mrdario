import { EventEmitter } from "events";
import { each } from "lodash";
import * as Mousetrap from "mousetrap";

import { GameInput, InputEventType } from "../../types";
import { InputManager, KeyBindings } from "../types";
import { GameControllerMode } from "../../controller";

export class KeyManager extends EventEmitter implements InputManager {
  public mode?: GameControllerMode;
  public keyBindings?: KeyBindings;

  constructor(keyBindings: KeyBindings) {
    super();
    this.registerKeys(keyBindings);
  }

  public registerKeys(keyBindings: KeyBindings, initialMode?: GameControllerMode): void {
    this.keyBindings = keyBindings;
    if (this.mode) {
      this.unbindModeKeys(this.mode);
    }
    if (initialMode || this.mode) {
      this.bindModeKeys((initialMode || this.mode) as GameControllerMode);
    }
  }
  public unbindModeKeys(mode: GameControllerMode): void {
    if (!this.keyBindings) {
      return;
    }
    const modeBindings = this.keyBindings[mode] || {};
    each(modeBindings, (keyStr, _inputType) => {
      if (!keyStr) {
        return;
      }
      Mousetrap.unbind(keyStr, InputEventType.KeyDown);
      Mousetrap.unbind(keyStr, InputEventType.KeyUp);
    });
  }
  public bindModeKeys(mode: GameControllerMode) {
    if (!this.keyBindings) {
      return;
    }
    const modeBindings = this.keyBindings[mode] || {};

    for (const inputTypeStr of Object.keys(modeBindings)) {
      const inputType = inputTypeStr as GameInput;
      const keyStr = modeBindings[inputType];
      if (!keyStr) {
        continue;
      }

      const handleKeyDown = this.handleInput.bind(this, inputType, InputEventType.KeyDown);
      Mousetrap.bind(keyStr, handleKeyDown, InputEventType.KeyDown);
      const handleKeyUp = this.handleInput.bind(this, inputType, InputEventType.KeyUp);
      Mousetrap.bind(keyStr, handleKeyUp, InputEventType.KeyUp);
    }
  }

  public handleInput(input: GameInput, eventType: InputEventType, event: KeyboardEvent) {
    super.emit("input", input, eventType);
    // super.emit(input, eventType);
    if (event.preventDefault) {
      event.preventDefault();
    }
  }

  public setMode(mode: GameControllerMode) {
    if (this.mode) {
      this.unbindModeKeys(this.mode);
    }
    this.bindModeKeys(mode);
    this.mode = mode;
  }
}
