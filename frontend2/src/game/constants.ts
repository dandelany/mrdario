import { times, constant } from "lodash";

export enum GameMode {
  Ready = "Ready",
  Playing = "Playing",
  Paused = "Paused",
  Won = "Won",
  Lost = "Lost",
  Ended = "Ended"
}

export enum GameInput {
  Play = "Play",
  Left = "Left",
  Right = "Right",
  Up = "Up",
  Down = "Down",
  RotateCCW = "RotateCCW",
  RotateCW = "RotateCW",
  Pause = "Pause",
  Resume = "Resume",
  Reset = "Reset"
}

export enum GridObject {
  Empty = "Empty",
  Virus = "Virus",
  PillTop = "PillTop",
  PillBottom = "PillBottom",
  PillLeft = "PillLeft",
  PillRight = "PillRight",
  PillSegment = "PillSegment",
  Destroyed = "Destroyed"
}

export enum SpeedLevel {
  Low = "Low",
  Medium = "Medium",
  High = "High"
}

export enum GameColor {
  Orange,
  Purple,
  Green
}

// how many colors are still humanly possible to play with?
export const COLORS = [GameColor.Orange, GameColor.Purple, GameColor.Green];

// http://tetrisconcept.net/wiki/Dr._Mario#Gravity
// base speed by level
export type SpeedTable = { [S in SpeedLevel]: number };

export const BASE_SPEED_TABLE: SpeedTable = {
  [SpeedLevel.Low]: 15,
  [SpeedLevel.Medium]: 25,
  [SpeedLevel.High]: 31
};

export type KeyBindings = { [M in GameMode]?: { [I in GameInput]?: string | string[] } };

export const DEFAULT_KEYS: KeyBindings = {
  //[MODES.READY]: { [INPUTS.PLAY]: 'enter, space, escape' },
  [GameMode.Playing]: {
    [GameInput.Left]: "left",
    [GameInput.Right]: "right",
    [GameInput.Up]: "up",
    [GameInput.Down]: "down",
    [GameInput.RotateCCW]: "a",
    [GameInput.RotateCW]: "s",
    [GameInput.Pause]: "escape"
  },
  [GameMode.Paused]: { [GameInput.Resume]: ["enter", "space", "escape"] },
  [GameMode.Won]: { [GameInput.Reset]: ["enter", "space", "escape"] },
  [GameMode.Lost]: { [GameInput.Reset]: ["enter", "space", "escape"] },
  [GameMode.Ready]: {},
  [GameMode.Ended]: {}
};

// width and height of game grid
export const PLAYFIELD_WIDTH = 8;
export const PLAYFIELD_HEIGHT = 16;

// http://tetrisconcept.net/wiki/Dr._Mario#Gravity
// # of frames it takes player pill to drop 1 row at speed [index]
export const GRAVITY_TABLE = [
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
export const MIN_VIRUS_ROW_TABLE = times(14, constant(6)).concat([5, 5, 4, 4, 3, 3]);

// http://www.gamefaqs.com/nes/587241-dr-mario/faqs/9483
// # of viruses at virus level [index]
export const VIRUS_COUNT_TABLE = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84];
