import {EventEmitter} from 'events';
import Hammer from 'hammerjs';

import {INPUTS} from 'game/constants';

export default class SwipeManager extends EventEmitter {
  constructor() {
    super();
    this.mc = new Hammer.Manager(document.body);
    this.registerControls();
  }

  registerControls() {
    this.mc.add([
      new Hammer.Swipe({direction: Hammer.DIRECTION_ALL}),
      new Hammer.Tap({ event: 'singletap' })

    ]);

    this.mc.on('swipeup', this.triggerKeyInputs.bind(this, INPUTS.UP));
    this.mc.on('swipeleft', this.triggerKeyInputs.bind(this, INPUTS.LEFT));
    this.mc.on('swiperight', this.triggerKeyInputs.bind(this, INPUTS.RIGHT));
    this.mc.on('swipedown', this.triggerKeyInputs.bind(this, INPUTS.DOWN));
    this.mc.on('singletap', this.triggerKeyInputs.bind(this, INPUTS.ROTATE_CW));
  }

  triggerKeyInputs(inputType, event) {
    this.handleInput(inputType, 'keydown', event);
    setTimeout(() => this.handleInput(inputType, 'keyup', event), 10);
  }
  handleInput(inputType, keyType, event) {
    super.emit(inputType, keyType, event);
  }

  setMode(mode) {
    this.mode = mode;
  }
}
