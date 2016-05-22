import {EventEmitter} from 'events';
import Hammer from 'hammerjs';

import {INPUTS} from 'constants';

export default class SwipeControls extends EventEmitter {
  constructor() {
    super();
    this.mc = new Hammer.Manager(document.getElementById('container'));
    this.registerControls();
  }

  registerControls() {
    this.mc.add([
      new Hammer.Swipe({direction: Hammer.DIRECTION_ALL}),
      new Hammer.Tap({ event: 'singletap' }),
      new Hammer.Tap({ event: 'doubletap', taps: 2 })
    ]);

    this.mc.on('swipeleft', this.triggerKeyInputs.bind(this, INPUTS.LEFT));
    this.mc.on('swiperight', this.triggerKeyInputs.bind(this, INPUTS.RIGHT));
    this.mc.on('swipedown', this.triggerKeyInputs.bind(this, INPUTS.DOWN));
    this.mc.on('singletap', this.triggerKeyInputs.bind(this, INPUTS.ROTATE_CW));
    this.mc.on('doubletap', this.triggerKeyInputs.bind(this, INPUTS.ROTATE_CCW));
  }

  triggerKeyInputs(inputType, event) {
    this.handleInput(inputType, 'keydown', event);
    setTimeout(() => this.handleInput(inputType, 'keyup', 2));
  }
  handleInput(inputType, keyType, event) {
    super.emit(inputType, keyType, event);
  }

  setMode(mode) {
    this.mode = mode;
  }
}
