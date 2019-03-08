import { INPUT_REPEAT_INTERVALS } from "./constants";
import { GameActionMove, GameInputMove, InputEventType, MoveInputNumberMap } from "./types";

export type MovingCounters = Map<GameInputMove, number>;
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
    this.movingCounters = new Map<GameInputMove, number>();
  }
  public getState(): InputRepeaterState {
    const { movingCounters } = this;
    return { movingCounters: new Map(movingCounters) };
  }
  public setState(state: InputRepeaterState) {
    this.movingCounters = state.movingCounters;
  }

  public tick(inputQueue: GameActionMove[] = []): GameInputMove[] {
    const { movingCounters } = this;
    const moveQueue: GameInputMove[] = [];

    // increment moving counters (for moves which are being held down)
    for (const entry of movingCounters.entries()) {
      const [key, count] = entry;
      movingCounters.set(key, count + 1);
    }

    // process inputs in inputQueue
    for (const { input, eventType } of inputQueue) {
      // start key press - add input direction to movingCounters
      if (eventType === InputEventType.KeyDown && !movingCounters.get(input)) {
        moveQueue.push(input);
        movingCounters.set(input, 0);
      } else if (eventType === InputEventType.KeyUp) {
        // end key press - remove input from movingCounters
        movingCounters.delete(input);
      }
    }

    // find inputs which have been held down long enough to repeat
    for (const [input, count] of movingCounters.entries()) {
      if (count >= repeatIntervals[input]) {
        // push the new move to the moveQueue and reset its counter
        moveQueue.push(input);
        movingCounters.set(input, 0);
      }
    }

    return moveQueue;
  }
}
