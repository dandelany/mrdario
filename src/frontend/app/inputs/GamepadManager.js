import inRange from 'lodash/inRange';
import {EventEmitter} from 'events';
// import Gamepads from 'gamepad-plus';
import Gamepads from 'gamepad-plus/src';

import {INPUTS} from 'game/constants';

const gamepadConfig = {
  axisThreshold: 0,
  indices: {
    'standard': {
      cursorX: 2,
      cursorY: 3,
      scrollX: 0,
      scrollY: 1,
      back: 9,
      forward: 8,
      vendor: 10,
      zoomIn: 5,
      zoomOut: 1
    },
    '46d-c216-Logitech Dual Action': {
      cursorX: 3,
      cursorY: 4,
      scrollX: 1,
      scrollY: 2,
      back: 8,
      forward: 9,
      vendor: null,
      zoomIn: 7,
      zoomOut: 6
    },
    '79-6-Generic   USB  Joystick': {
      cursorX: null,
      cursorY: null,
      scrollX: 3,
      scrollY: 2,
      back: 6,
      forward: 7,
      vendor: null,
      zoomIn: 9,
      zoomOut: 8
    },
    keyEvents: {
      vendor: {
        detail: {
          charCode: 0,
          key: 'Escape',
          keyCode: 27
        }
      }
    }
  }
};

export default class GamepadManager extends EventEmitter {
  constructor() {
    super();

    this.gamepads = new Gamepads(gamepadConfig);
    this.gamepads.polling = false;

    this.registerControls();
  }

  registerControls() {
    const {gamepads} = this;

    if (gamepads.gamepadsSupported) {
      gamepads.updateStatus = function () {
        gamepads.polling = true;
        gamepads.update();
        window.requestAnimationFrame(gamepads.updateStatus);
      };

      gamepads.cancelLoop = function () {
        gamepads.polling = false;
        if (gamepads.pollingInterval) {
          window.clearInterval(gamepads.pollingInterval);
        }
        window.cancelAnimationFrame(gamepads.updateStatus);
      };

      window.addEventListener('gamepadconnected', function (e) {
        // console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.',
        //   e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);

        gamepads.updateStatus();
      });

      window.addEventListener('gamepaddisconnected', function (e) {
        console.log('Gamepad removed at index %d: %s.', e.gamepad.index, e.gamepad.id);
      });

      if (gamepads.nonstandardEventsEnabled) {
        window.addEventListener('gamepadaxismove', (e) => {
          // console.log('Gamepad axis move at index %d: %s. Axis: %d. Value: %f.',
          //   e.gamepad.index, e.gamepad.id, e.axis, e.value);

          const {axis, value} = e;
          if(axis === 0) {
            if(value < -0.75) {
              this.handleInput(INPUTS.LEFT, 'keydown', e);
            } else if(value > 0.75) {
              this.handleInput(INPUTS.RIGHT, 'keydown', e);
            } else if(value > -0.08 && value < 0.08) {
              this.handleInput(INPUTS.LEFT, 'keyup', e);
              this.handleInput(INPUTS.RIGHT, 'keyup', e);
            }

          } else if(axis === 1) {
            // https://www.youtube.com/watch?v=lITuHDdhdkw
            if(value < -0.75) {
              this.handleInput(INPUTS.UP, 'keydown', e);
            } else if(value > 0.75) {
              this.handleInput(INPUTS.DOWN, 'keydown', e);
            } else if(value > -0.08 && value < 0.08) {
              this.handleInput(INPUTS.UP, 'keyup', e);
              this.handleInput(INPUTS.DOWN, 'keyup', e);
            }
          } else if(axis === 9) {
            // custom shit for the 8bitdo D-pad
            if(inRange(value, 3.25, 3.35)) {
              this.handleInput(INPUTS.LEFT, 'keyup', e);
              this.handleInput(INPUTS.RIGHT, 'keyup', e);
              this.handleInput(INPUTS.UP, 'keyup', e);
              this.handleInput(INPUTS.DOWN, 'keyup', e);
            } else if(inRange(value, 0.65, 0.75)) {
              this.handleInput(INPUTS.LEFT, 'keydown', e);
            } else if(inRange(value, -0.45, -0.4)) {
              this.handleInput(INPUTS.RIGHT, 'keydown', e);
            } else if(value < -0.9) {
              this.handleInput(INPUTS.UP, 'keydown', e);
            } else if(inRange(value, 0.1, 0.2)) {
              this.handleInput(INPUTS.DOWN, 'keydown', e);
            }
          }
        });

        window.addEventListener('gamepadbuttondown', (e) => {
          // console.log('Gamepad button down at index %d: %s. Button: %d.',
          //   e.gamepad.index, e.gamepad.id, e.button);

          const {button} = e;
          // extra rotate button on SNES style button pads
          if(button === 0 || button === 4) {
            this.handleInput(INPUTS.ROTATE_CCW, 'keydown', e);
          } else if(button === 1) {
            this.handleInput(INPUTS.ROTATE_CW, 'keydown', e);
          }
        });

        window.addEventListener('gamepadbuttonup', (e) => {
          // console.log('Gamepad button up at index %d: %s. Button: %d.',
          //   e.gamepad.index, e.gamepad.id, e.button);

          const {button} = e;
          if(button === 0 || button === 4) {
            this.handleInput(INPUTS.ROTATE_CCW, 'keyup', e);
          } else if(button === 1) {
            this.handleInput(INPUTS.ROTATE_CW, 'keyup', e);
          }
        });
      }
    }
  }
  
  handleInput(inputType, keyType, event) {
    super.emit(inputType, keyType, event);
  }

  setMode(mode) {
    this.mode = mode;
  }
}
