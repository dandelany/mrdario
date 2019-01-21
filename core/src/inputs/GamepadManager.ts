import { EventEmitter } from "events";
import {
  GamepadPlusAxisEvent,
  GamepadPlusButtonEvent,
  GamepadPlusEvent,
  Gamepads
} from "gamepad-plus";
import { inRange } from "lodash";
// import Gamepads from "gamepad-plus/src";

import { GameControllerMode, GameInput, InputEventType } from "../types";

const gamepadConfig = {
  axisThreshold: 0,
  indices: {
    standard: {
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
    "46d-c216-Logitech Dual Action": {
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
    "79-6-Generic   USB  Joystick": {
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
          key: "Escape",
          keyCode: 27
        }
      }
    }
  }
};

export default class GamepadManager extends EventEmitter {
  public mode?: GameControllerMode;
  // todo fix gamepads typing
  public gamepads: any;

  constructor() {
    super();

    this.gamepads = new Gamepads(gamepadConfig);
    this.gamepads.polling = false;

    this.registerControls();
  }

  public registerControls() {
    const { gamepads } = this;

    if (gamepads.gamepadsSupported) {
      gamepads.updateStatus = () => {
        gamepads.polling = true;
        gamepads.update();
        window.requestAnimationFrame(gamepads.updateStatus);
      };

      gamepads.cancelLoop = () => {
        gamepads.polling = false;
        if (gamepads.pollingInterval) {
          window.clearInterval(gamepads.pollingInterval);
        }
        window.cancelAnimationFrame(gamepads.updateStatus);
      };

      window.addEventListener("gamepadconnected", (e: Event) => {
        const gamepadEvent = e as GamepadPlusEvent;
        console.log(
          "Gamepad connected at index %d: %s. %d buttons, %d axes.",
          gamepadEvent.gamepad.index,
          gamepadEvent.gamepad.id,
          gamepadEvent.gamepad.buttons.length,
          gamepadEvent.gamepad.axes.length
        );

        gamepads.updateStatus();
      });

      window.addEventListener("gamepaddisconnected", (e: Event) => {
        const gamepadEvent = e as GamepadPlusEvent;
        console.log(
          "Gamepad removed at index %d: %s.",
          gamepadEvent.gamepad.index,
          gamepadEvent.gamepad.id
        );
      });

      if (gamepads.nonstandardEventsEnabled) {
        window.addEventListener("gamepadaxismove", (e: Event) => {
          const gamepadEvent = e as GamepadPlusAxisEvent;
          // console.log('Gamepad axis move at index %d: %s. Axis: %d. Value: %f.',
          //   gamepadEvent.gamepad.index, gamepadEvent.gamepad.id, gamepadEvent.axis, gamepadEvent.value);

          const { axis, value } = gamepadEvent;
          if (axis === 0) {
            if (value < -0.75) {
              this.handleInput(GameInput.Left, InputEventType.KeyDown, e);
            } else if (value > 0.75) {
              this.handleInput(GameInput.Right, InputEventType.KeyDown, e);
            } else if (value > -0.08 && value < 0.08) {
              this.handleInput(GameInput.Left, InputEventType.KeyUp, e);
              this.handleInput(GameInput.Right, InputEventType.KeyUp, e);
            }
          } else if (axis === 1) {
            // https://www.youtube.com/watch?v=lITuHDdhdkw
            if (value < -0.75) {
              this.handleInput(GameInput.Up, InputEventType.KeyDown, e);
            } else if (value > 0.75) {
              this.handleInput(GameInput.Down, InputEventType.KeyDown, e);
            } else if (value > -0.08 && value < 0.08) {
              this.handleInput(GameInput.Up, InputEventType.KeyUp, e);
              this.handleInput(GameInput.Down, InputEventType.KeyUp, e);
            }
          } else if (axis === 9) {
            // custom shit for the 8bitdo D-pad
            if (inRange(value, 3.25, 3.35)) {
              this.handleInput(GameInput.Left, InputEventType.KeyUp, e);
              this.handleInput(GameInput.Right, InputEventType.KeyUp, e);
              this.handleInput(GameInput.Up, InputEventType.KeyUp, e);
              this.handleInput(GameInput.Down, InputEventType.KeyUp, e);
            } else if (inRange(value, 0.65, 0.75)) {
              this.handleInput(GameInput.Left, InputEventType.KeyDown, e);
            } else if (inRange(value, -0.45, -0.4)) {
              this.handleInput(GameInput.Right, InputEventType.KeyDown, e);
            } else if (value < -0.9) {
              this.handleInput(GameInput.Up, InputEventType.KeyDown, e);
            } else if (inRange(value, 0.1, 0.2)) {
              this.handleInput(GameInput.Down, InputEventType.KeyDown, e);
            }
          }
        });

        window.addEventListener("gamepadbuttondown", (e: Event) => {
          const buttonEvent = e as GamepadPlusButtonEvent;
          // console.log('Gamepad button down at index %d: %s. Button: %d.',
          //   e.gamepad.index, e.gamepad.id, e.button);

          const { button } = buttonEvent;
          // extra rotate button on SNES style button pads
          if (button === 0 || button === 4) {
            this.handleInput(GameInput.RotateCCW, InputEventType.KeyDown, buttonEvent);
          } else if (button === 1) {
            this.handleInput(GameInput.RotateCW, InputEventType.KeyDown, buttonEvent);
          }
        });

        window.addEventListener("gamepadbuttonup", (e: Event) => {
          const buttonEvent = e as GamepadPlusButtonEvent;
          // console.log('Gamepad button up at index %d: %s. Button: %d.',
          //   e.gamepad.index, e.gamepad.id, e.button);

          const { button } = buttonEvent;
          if (button === 0 || button === 4) {
            this.handleInput(GameInput.RotateCCW, InputEventType.KeyUp, buttonEvent);
          } else if (button === 1) {
            this.handleInput(GameInput.RotateCW, InputEventType.KeyUp, buttonEvent);
          }
        });
      }
    }
  }

  public handleInput(inputType: GameInput, keyType: string, event: object) {
    super.emit(inputType, keyType, event);
  }

  public setMode(mode: GameControllerMode) {
    this.mode = mode;
    // todo: unbind/bind based on mode - see KeyManager
  }
}
