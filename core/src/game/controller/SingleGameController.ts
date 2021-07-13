import {
  DEFAULT_GAME_CONTROLLER_OPTIONS,
  GameController,
  GameControllerMode,
  GameControllerPublicState
} from "./GameController2";
import { GameOptions, InputManager, TimedMoveActions } from "../types";
import { defaults, noop } from "lodash";


export const DEFAULT_SINGLE_GAME_CONTROLLER_OPTIONS: SingleGameControllerOptions = {
  gameOptions: DEFAULT_GAME_CONTROLLER_OPTIONS.gameOptions[0],

  // list of input managers, eg. of keyboard, touch events
  // these are event emitters that fire on every user game input (move)
  // moves are queued and fed into the game to control it
  inputManagers: [],
  // render function which is called when game state changes
  // this should be the main connection between game logic and presentation
  render: noop,
  // callback called when state machine mode changes
  onChangeMode: noop
};
const defaultOptions = DEFAULT_SINGLE_GAME_CONTROLLER_OPTIONS;

export interface SingleGameControllerOptions {
  seed?: string;
  gameOptions: Partial<GameOptions>;
  hasHistory?: boolean;
  getTime?: () => number;
  // each game may provide its own inputmanagers
  inputManagers: InputManager[];
  render: (state: GameControllerPublicState, dt?: number) => any;
  onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => any;
  onMoveActions?: (timedMoveActions: TimedMoveActions) => void;
}

export class SingleGameController extends GameController {
  constructor(passedOptions: Partial<SingleGameControllerOptions> = {}) {
    const options: SingleGameControllerOptions = defaults({}, passedOptions, defaultOptions);
    const onMoveActions = (options.onMoveActions === undefined) ?
      undefined :
      (_i: number, timedMoveActions: TimedMoveActions) => {
        if(options.onMoveActions) options.onMoveActions(timedMoveActions);
      };

    super({
      ...options,
      players: 1,
      gameOptions: [options.gameOptions],
      inputManagers: [options.inputManagers],
      onMoveActions
    })
  }
}
