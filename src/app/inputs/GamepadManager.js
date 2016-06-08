import {EventEmitter} from 'events';
import Hammer from 'hammerjs';
// import gamepad from 'gamepad';

// var Gamepads = require('gamepad-plus')

// import Gamepads from 'gamepad-plus';

import {INPUTS} from 'constants';


// import Gamepads from '../utils/gamepad-plus/index';

(function (window) {

  var gamepadConfig = {
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

  var gamepads = new Gamepads(gamepadConfig);

  gamepads.polling = false;

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
      console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.',
        e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);

      gamepads.updateStatus();
    });

    window.addEventListener('gamepaddisconnected', function (e) {
      console.log('Gamepad removed at index %d: %s.', e.gamepad.index, e.gamepad.id);
    });

    if (gamepads.nonstandardEventsEnabled) {
      window.addEventListener('gamepadaxismove', function (e) {
        console.log('Gamepad axis move at index %d: %s. Axis: %d. Value: %f.',
          e.gamepad.index, e.gamepad.id, e.axis, e.value);
      });

      window.addEventListener('gamepadbuttondown', function (e) {
        console.log('Gamepad button down at index %d: %s. Button: %d.',
          e.gamepad.index, e.gamepad.id, e.button);
      });

      window.addEventListener('gamepadbuttonup', function (e) {
        console.log('Gamepad button up at index %d: %s. Button: %d.',
          e.gamepad.index, e.gamepad.id, e.button);
      });
    }

    if (gamepads.keyEventsEnabled) {
      window.addEventListener('keydown', function (e) {
        if (!e.gamepad) {
          return;
        }
        console.log('Keydown event from gamepad button down at index %d: %s. Button: %d. Key: %s. Key code: %d.',
          e.gamepad.index, e.gamepad.id, e.button, e.key || '?', e.keyCode);
      });

      window.addEventListener('keypress', function (e) {
        if (!e.gamepad) {
          return;
        }
        console.log('Keypress event from gamepad button down at index %d: %s. Button: %d. Key: %s. Key code: %d.',
          e.gamepad.index, e.gamepad.id, e.button, e.key || '?', e.keyCode);
      });

      window.addEventListener('keyup', function (e) {
        if (!e.gamepad) {
          return;
        }
        console.log('Keyup event from gamepad button down at index %d: %s. Button: %d. Key: %s. Key code: %d.',
          e.gamepad.index, e.gamepad.id, e.button, e.key || '?', e.keyCode);
      });
    }
  }

  window.gamepads = gamepads;

})(window);



export default class GamepadManager extends EventEmitter {
  constructor() {
    super();



    // this.frameInterval = setInterval(gamepad.processEvents, 16);
    // this.deviceInterval = setInterval(gamepad.detectDevices, 500);

    this.registerControls();
  }

  registerControls() {
    // console.log('registering gamepad controls');
    // var gamepads = new Gamepads({});
    // gamepads.polling = false;
    //
    // if (gamepads.gamepadsSupported) {
    //   console.log('supported');
    //
    //   gamepads.updateStatus = function () {
    //     gamepads.polling = true;
    //     gamepads.update();
    //     window.requestAnimationFrame(gamepads.updateStatus);
    //   };
    //
    //   gamepads.cancelLoop = function () {
    //     gamepads.polling = false;
    //     if (gamepads.pollingInterval) {
    //       window.clearInterval(gamepads.pollingInterval);
    //     }
    //     window.cancelAnimationFrame(gamepads.updateStatus);
    //   };
    //
    //   window.addEventListener('gamepadconnected', function (e) {
    //     console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.',
    //       e.gamepad.index, e.gamepad.id, e.gamepad.buttons.length, e.gamepad.axes.length);
    //
    //     gamepads.updateStatus();
    //   });
    //
    //   window.addEventListener('gamepaddisconnected', function (e) {
    //     console.log('Gamepad removed at index %d: %s.', e.gamepad.index, e.gamepad.id);
    //   });
    //
    //   if (gamepads.nonstandardEventsEnabled) {
    //     console.log('nonstandardEventsEnabled');
    //
    //     window.addEventListener('gamepadaxismove', function (e) {
    //       console.log('Gamepad axis move at index %d: %s. Axis: %d. Value: %f.',
    //         e.gamepad.index, e.gamepad.id, e.axis, e.value);
    //     });
    //
    //     window.addEventListener('gamepadbuttondown', function (e) {
    //       console.log('Gamepad button down at index %d: %s. Button: %d.',
    //         e.gamepad.index, e.gamepad.id, e.button);
    //     });
    //
    //     window.addEventListener('gamepadbuttonup', function (e) {
    //       console.log('Gamepad button up at index %d: %s. Button: %d.',
    //         e.gamepad.index, e.gamepad.id, e.button);
    //     });
    //   }
    // }


    //
    // this.mc.add([
    //   new Hammer.Swipe({direction: Hammer.DIRECTION_ALL}),
    //   new Hammer.Tap({ event: 'singletap' })
    //
    // ]);
    //
    // this.mc.on('swipeleft', this.triggerKeyInputs.bind(this, INPUTS.LEFT));
    // this.mc.on('swiperight', this.triggerKeyInputs.bind(this, INPUTS.RIGHT));
    // this.mc.on('swipedown', this.triggerKeyInputs.bind(this, INPUTS.DOWN));
    // this.mc.on('singletap', this.triggerKeyInputs.bind(this, INPUTS.ROTATE_CW));
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
