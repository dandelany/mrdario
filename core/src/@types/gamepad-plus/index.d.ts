declare module "gamepad-plus" {
  export interface GamepadsConfig {
    axisThreshold: number;
    gamepadAttributesEnabled: boolean;
    gamepadIndicesEnabled: boolean;
    keyEventsEnabled: boolean;
    nonstandardEventsEnabled: boolean;
    indices?: any;
    keyEvents?: any;
  }

  export class Gamepads {
    constructor(config: Partial<GamepadsConfig>);
    polling: boolean;
  }

  export interface GamepadPlusEvent extends GamepadEvent {}

  export interface GamepadPlusAxisEvent extends GamepadPlusEvent {
    axis: number;
    value: number;
  }

  export interface GamepadPlusButtonEvent extends GamepadPlusEvent {
    button: number;
  }
}
