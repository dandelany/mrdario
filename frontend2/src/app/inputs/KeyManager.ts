import {EventEmitter} from 'events';
import * as _ from 'lodash';
import * as Mousetrap from 'mousetrap';
import { GameInput, GameMode, KeyBindings } from "../../game/constants";


interface InputManager extends EventEmitter {
  setMode: (mode: string) => any;
}

export default class KeyManager extends EventEmitter implements InputManager {
  mode?: GameMode;
  keyBindings?: KeyBindings;

  constructor(keyBindings: KeyBindings) {
    super();
    this.registerKeys(keyBindings);
  }

  registerKeys(keyBindings: KeyBindings, initialMode?: GameMode) {
    this.keyBindings = keyBindings;
    if(this.mode) this.unbindModeKeys(this.mode);
    if(initialMode || this.mode) this.bindModeKeys((initialMode || this.mode) as GameMode);
  }
  unbindModeKeys(mode: GameMode) {
    if(!this.keyBindings) return;
    const modeBindings = this.keyBindings[mode] || {};
    _.each(modeBindings, (keyStr, _inputType) => {
      if(!keyStr) return;
      Mousetrap.unbind(keyStr, 'keydown');
      Mousetrap.unbind(keyStr, 'keyup');
    });
  }
  bindModeKeys(mode: GameMode) {
    if(!this.keyBindings) return;
    const modeBindings = this.keyBindings[mode] || {};
    _.each(modeBindings, (keyStr, inputType: GameInput) => {
      if(!keyStr) return;
      Mousetrap.bind(keyStr, this.handleInput.bind(this, inputType, 'keydown'), 'keydown');
      Mousetrap.bind(keyStr, this.handleInput.bind(this, inputType, 'keyup'), 'keyup');
    });
  }

  handleInput(inputType: GameInput, keyType: string, event: object) {
    super.emit(inputType, keyType, event);
  }

  setMode(mode: GameMode) {
    if(this.mode) this.unbindModeKeys(this.mode);
    this.bindModeKeys(mode);
    this.mode = mode;
  }
}
