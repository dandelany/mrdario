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
      // new Hammer.Swipe({direction: Hammer.DIRECTION_ALL}),
      new Hammer.Pan({direction: Hammer.DIRECTION_ALL, threshold: 35}),
      new Hammer.Tap({ event: 'singletap' })

    ]);

    // this.mc.on('swipeup', this.triggerKeyInputs.bind(this, INPUTS.UP));
    // this.mc.on('swipeleft', this.triggerKeyInputs.bind(this, INPUTS.LEFT));
    // this.mc.on('swiperight', this.triggerKeyInputs.bind(this, INPUTS.RIGHT));
    // this.mc.on('swipedown', this.triggerKeyInputs.bind(this, INPUTS.DOWN));


    // this.mc.on('panup', () => console.log('panup'));
    // this.mc.on('panleft', () => console.log('panleft'));
    // this.mc.on('panright', () => console.log('panright'));
    // this.mc.on('pandown', () => console.log('pandown'));
    // this.mc.on('panleft', this.triggerKeyInputs.bind(this, INPUTS.LEFT));
    // this.mc.on('panright', this.triggerKeyInputs.bind(this, INPUTS.RIGHT));
    // this.mc.on('pandown', this.triggerKeyInputs.bind(this, INPUTS.DOWN));

    // this.mc.on('panstart', (a, b, c) => console.log('panstart', [a, b, c]));

    this.downInputs = new Set();

    this.mc.on('panstart', (e) => {
      console.log('panstart', e.additionalEvent);
      switch(e.additionalEvent) {
        case 'panup':
          this.handleInput(INPUTS.Up, 'keydown', e);
          this.downInputs.add(INPUTS.Up);
          break;
        case 'pandown':
          this.handleInput(INPUTS.Down, 'keydown', e);
          this.downInputs.add(INPUTS.Down);
          break;
        case 'panleft':
          this.handleInput(INPUTS.Left, 'keydown', e);
          this.downInputs.add(INPUTS.Left);
          break;
        case 'panright':
          this.handleInput(INPUTS.Right, 'keydown', e);
          this.downInputs.add(INPUTS.Right);
          break;
      }
    });

    this.mc.on('panend', (e) => {
      for(const inputType of this.downInputs) {
        this.handleInput(inputType, 'keyup', e);
        this.downInputs.delete(inputType);
      }
    });




    this.mc.on('singletap', this.triggerKeyInputs.bind(this, INPUTS.RotateCW));
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
