import { constant, times } from "lodash";
import {
  GameColor,
  GameInput,
  MoveInputNumberMap,
  OneOrMore,
  SpeedLevel,
  SpeedTable
} from "@/game/types";

// width and height of game grid
export const PLAYFIELD_WIDTH: number = 8;
export const PLAYFIELD_HEIGHT: number = 16;

// how many colors are still humanly possible to play with?
export const COLORS: OneOrMore<GameColor> = [GameColor.Color1, GameColor.Color2, GameColor.Color3];

// http://tetrisconcept.net/wiki/Dr._Mario#Gravity
// base speed by level
export const BASE_SPEED_TABLE: SpeedTable = {
  [SpeedLevel.Low]: 15,
  [SpeedLevel.Medium]: 25,
  [SpeedLevel.High]: 31
};

// the # of frames for which an input must be held down until it repeats.
// different for each input, based on empirical testing
// NOTE: DO NOT SET THESE VALUES LARGER THAN 35 OR WILL BREAK ENCODER(?)
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

// debris fall speed - # of ticks it takes for debris to fall by one cell
export const CASCADE_TICK_COUNT = 20;

// time delay (in # of ticks) pills being destroyed stay in "destroyed" state before cascading
export const DESTROY_TICK_COUNT = 20;

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
