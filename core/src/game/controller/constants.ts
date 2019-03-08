import { noop } from "lodash";
import { getGetTime } from "../../utils/time";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../constants";
import { GameInput } from "../enums";
// options that can be passed to control game parameters
import { GameControllerMode, GameControllerOptions, KeyBindings } from "./GameController";

export const DEFAULT_GAME_CONTROLLER_OPTIONS: GameControllerOptions = {
  gameOptions: {
    // current virus level (generally 1-20)
    level: 0,
    // pill fall speed
    baseSpeed: 15,
    // width and height of the playfield grid, in grid units
    height: PLAYFIELD_HEIGHT,
    width: PLAYFIELD_WIDTH
  },
  hasHistory: true,
  getTime: getGetTime(),
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

export const DEFAULT_KEYS: KeyBindings = {
  // [MODES.READY]: { [INPUTS.PLAY]: 'enter, space, escape' },
  [GameControllerMode.Playing]: {
    [GameInput.Left]: "left",
    [GameInput.Right]: "right",
    [GameInput.Up]: "up",
    [GameInput.Down]: "down",
    [GameInput.RotateCCW]: "a",
    [GameInput.RotateCW]: "s",
    [GameInput.Pause]: "escape"
  },
  [GameControllerMode.Paused]: {
    [GameInput.Resume]: ["enter", "space", "escape"]
  },
  [GameControllerMode.Won]: { [GameInput.Reset]: ["enter", "space", "escape"] },
  [GameControllerMode.Lost]: {
    [GameInput.Reset]: ["enter", "space", "escape"]
  },
  [GameControllerMode.Ready]: {},
  [GameControllerMode.Ended]: {}
};
