import { constant, noop, times } from "lodash";
import {
  GameColor,
  GameControllerMode,
  GameControllerOptions,
  GameInput,
  KeyBindings,
  MoveInputNumberMap,
  OneOrMore,
  SpeedLevel,
  SpeedTable
} from "./types";

// width and height of game grid
export const PLAYFIELD_WIDTH: number = 8;
export const PLAYFIELD_HEIGHT: number = 16;

// options that can be passed to control game parameters
export const DEFAULT_GAME_CONTROLLER_OPTIONS: GameControllerOptions = {
  // list of input managers, eg. of keyboard, touch events
  // these are event emitters that fire on every user game input (move)
  // moves are queued and fed into the game to control it
  inputManagers: [],
  // render function which is called when game state changes
  // this should be the main connection between game logic and presentation
  render: noop,
  // callback called when state machine mode changes
  onChangeMode: noop,
  // current virus level (generally 1-20)
  level: 0,
  // pill fall speed
  speed: 15,
  // width and height of the playfield grid, in grid units
  height: PLAYFIELD_HEIGHT,
  width: PLAYFIELD_WIDTH,
  // frames (this.tick/render calls) per second
  fps: 60,
  // slow motion factor, to simulate faster/slower gameplay for debugging
  slow: 1
};

// how many colors are still humanly possible to play with?
export const COLORS: OneOrMore<GameColor> = [GameColor.Color1, GameColor.Color2, GameColor.Color3];

// http://tetrisconcept.net/wiki/Dr._Mario#Gravity
// base speed by level
export const BASE_SPEED_TABLE: SpeedTable = {
  [SpeedLevel.Low]: 15,
  [SpeedLevel.Medium]: 25,
  [SpeedLevel.High]: 31
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
  [GameControllerMode.Paused]: { [GameInput.Resume]: ["enter", "space", "escape"] },
  [GameControllerMode.Won]: { [GameInput.Reset]: ["enter", "space", "escape"] },
  [GameControllerMode.Lost]: { [GameInput.Reset]: ["enter", "space", "escape"] },
  [GameControllerMode.Ready]: {},
  [GameControllerMode.Ended]: {}
};

// the # of frames for which an input must be held down until it repeats.
// different for each input, based on empirical testing
// NOTE: DO NOT SET THESE VALUES LARGER THAN 35 OR WILL BREAK ENCODER
export const INPUT_REPEAT_INTERVALS: MoveInputNumberMap = {
  [GameInput.Up]: 24,
  [GameInput.Down]: 4,
  [GameInput.Left]: 8,
  [GameInput.Right]: 8,
  [GameInput.RotateCCW]: 12,
  [GameInput.RotateCW]: 12
};


// Every ACCELERATE_INTERVAL pills, the gravity increases by one
export const ACCELERATE_INTERVAL = 10;

// http://tetrisconcept.net/wiki/Dr._Mario#Gravity
// # of frames it takes player pill to drop 1 row at speed [index]
export const GRAVITY_TABLE: number[] = [
  69,
  67,
  65,
  63,
  61,
  59,
  57,
  55,
  53,
  51,
  49,
  47,
  45,
  43,
  41,
  39,
  37,
  35,
  33,
  31,
  29,
  27,
  25,
  23,
  21,
  19,
  18,
  17,
  16,
  15,
  14,
  13,
  12,
  11,
  10,
  9,
  9,
  8,
  8,
  7,
  7,
  6,
  6,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  5,
  4,
  4,
  4,
  4,
  4,
  3,
  3,
  3,
  3,
  3,
  2,
  2,
  2,
  2,
  2,
  1
];

// http://tetrisconcept.net/wiki/Dr._Mario#Virus_Generation
// highest row where viruses can be generated at virus level [index]
// inverse of original because we count from top
export const MIN_VIRUS_ROW_TABLE: number[] = times<number>(14, constant(6)).concat([
  5,
  5,
  4,
  4,
  3,
  3
]);

// http://www.gamefaqs.com/nes/587241-dr-mario/faqs/9483
// # of viruses at virus level [index]
export const VIRUS_COUNT_TABLE: number[] = [
  4,
  8,
  12,
  16,
  20,
  24,
  28,
  32,
  36,
  40,
  44,
  48,
  52,
  56,
  60,
  64,
  68,
  72,
  76,
  80,
  84
];
