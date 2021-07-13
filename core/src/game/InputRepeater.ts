import { INPUT_REPEAT_INTERVALS } from "./constants";
import { GameInputMove, InputEventType, MoveInputNumberMap } from "./types";
import { GameActionMove } from "./types/gameAction";

export type MovingCounters = Partial<Record<GameInputMove, number>>;
export interface InputRepeaterState {
  movingCounters: MovingCounters;
}

// the # of frames for which an input must be held down until it repeats.
// different for each input, based on empirical testing
export const repeatIntervals: MoveInputNumberMap = INPUT_REPEAT_INTERVALS;

export class InputRepeater implements InputRepeaterState {
  public movingCounters: MovingCounters;

  constructor() {
    // these counters count up while a move key is held down (for normalizing key-repeat)
    // ie. represents the # of frames during which we have been moving in a particular direction
    this.movingCounters = {};
  }
  public getState(): InputRepeaterState {
    return { movingCounters: { ...this.movingCounters } };
  }
  public setState(state: InputRepeaterState) {
    this.movingCounters = state.movingCounters;
  }

  public tick = (inputQueue: GameActionMove[] = []): GameInputMove[] => {
    const { movingCounters } = this;
    const moveQueue: GameInputMove[] = [];

    // increment moving counters (for moves which are being held down)
    for (const key in movingCounters) {
      const moveKey = key as GameInputMove;
      const count = movingCounters[moveKey] as number;
      movingCounters[moveKey] = count + 1;
    }

    // process inputs in inputQueue
    for (const { input, eventType } of inputQueue) {
      // start key press - add input direction to movingCounters
      if (eventType === InputEventType.KeyDown && !(input in movingCounters)) {
        moveQueue.push(input);
        movingCounters[input] = 0;
      } else if (eventType === InputEventType.KeyUp) {
        // end key press - remove input from movingCounters
        delete movingCounters[input];
      }
    }

    // find inputs which have been held down long enough to repeat
    for (const input in movingCounters) {
      const gameInput = input as GameInputMove;
      const count = movingCounters[gameInput] as number;
      if (count >= repeatIntervals[gameInput]) {
        // push the new move to the moveQueue and reset its counter
        moveQueue.push(gameInput);
        movingCounters[gameInput] = 0;
      }
    }

    return moveQueue;
  };
}
