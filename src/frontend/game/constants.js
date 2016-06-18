import times from 'lodash/times';
import constant from 'lodash/constant';
import keyMirror from 'keymirror';

export const MODES = keyMirror({
  READY: null,
  PLAYING: null,
  PAUSED: null,
  WON: null,
  LOST: null,
  ENDED: null
});

export const INPUTS = keyMirror({
  PLAY: null,
  LEFT: null,
  RIGHT: null,
  UP: null,
  DOWN: null,
  ROTATE_CCW: null,
  ROTATE_CW: null,
  PAUSE: null,
  RESUME: null,
  RESET: null
});

export const GRID_OBJECTS = keyMirror({
  EMPTY: null,
  VIRUS: null,
  PILL_TOP: null,
  PILL_BOTTOM: null,
  PILL_LEFT: null,
  PILL_RIGHT: null,
  PILL_SEGMENT: null,
  DESTROYED: null
});

export const SPEED_LEVELS = keyMirror({
  LOW: null,
  MEDIUM: null,
  HIGH: null
});

// http://tetrisconcept.net/wiki/Dr._Mario#Gravity
// base speed by level
export const BASE_SPEED_TABLE = {
  [SPEED_LEVELS.LOW]:    15,
  [SPEED_LEVELS.MEDIUM]: 25,
  [SPEED_LEVELS.HIGH]:   31
};

export const DEFAULT_KEYS = {
  //[MODES.READY]: { [INPUTS.PLAY]: 'enter, space, escape' },
  [MODES.PLAYING]: {
    [INPUTS.LEFT]: 'left',
    [INPUTS.RIGHT]: 'right',
    [INPUTS.UP]: 'up',
    [INPUTS.DOWN]: 'down',
    [INPUTS.ROTATE_CCW]: 'a',
    [INPUTS.ROTATE_CW]: 's',
    [INPUTS.PAUSE]: 'escape'
  },
  [MODES.PAUSED]: { [INPUTS.RESUME]: 'enter, space, escape' },
  [MODES.WON]: { [INPUTS.RESET]: 'enter, space, escape' },
  [MODES.LOST]: { [INPUTS.RESET]: 'enter, space, escape' }
};

// how many colors are still humanly possible to play with?
export const COLORS = [0, 1, 2];

// width and height of game grid
export const PLAYFIELD_WIDTH =  8;
export const PLAYFIELD_HEIGHT = 16;

// http://tetrisconcept.net/wiki/Dr._Mario#Gravity
// # of frames it takes player pill to drop 1 row at speed [index]
export const GRAVITY_TABLE = [
  69, 67, 65, 63, 61,  59, 57, 55, 53, 51,
  49, 47, 45, 43, 41,  39, 37, 35, 33, 31,
  29, 27, 25, 23, 21,  19, 18, 17, 16, 15,
  14, 13, 12, 11, 10,  9,  9,  8,  8,  7,
  7,  6,  6,  5,  5,   5,  5,  5,  5,  5,
  5,  5,  5,  5,  5,   4,  4,  4,  4,  4,
  3,  3,  3,  3,  3,   2,  2,  2,  2,  2,
  1
];

// http://tetrisconcept.net/wiki/Dr._Mario#Virus_Generation
// highest row where viruses can be generated at virus level [index]
// inverse of original because we count from top
export const MIN_VIRUS_ROW_TABLE = times(14, constant(6)).concat([5, 5, 4, 4, 3, 3]);

// http://www.gamefaqs.com/nes/587241-dr-mario/faqs/9483
// # of viruses at virus level [index]
export const VIRUS_COUNT_TABLE = [
  4,  8,  12, 16, 20,  24, 28, 32, 36, 40,
  44, 48, 52, 56, 60,  64, 68, 72, 76, 80,
  84
];
