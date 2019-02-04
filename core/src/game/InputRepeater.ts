import { INPUT_REPEAT_INTERVALS } from "./constants";
import {
  GameInput,
  GameInputMove,
  InputEventType,
  MoveInputEvent,
  MoveInputNumberMap
} from "./types";

export type MovingDirections = Map<GameInputMove, true>;
export type MovingCounters = Map<GameInputMove, number>;
export interface InputRepeaterState {
  movingDirections: MovingDirections;
  movingCounters: MovingCounters;
}

// the # of frames for which an input must be held down until it repeats.
// different for each input, based on empirical testing
export const repeatIntervals: MoveInputNumberMap = INPUT_REPEAT_INTERVALS;

export class InputRepeater implements InputRepeaterState {
  // public movingCounters: MoveInputNumberMap;
  public movingDirections: MovingDirections;
  public movingCounters: MovingCounters;

  constructor() {
    // the directions we are currently moving, while a move key is held down
    this.movingDirections = new Map<GameInputMove, true>();

    // these counters count up while a move key is held down (for normalizing key-repeat)
    // ie. represents the # of frames during which we have been moving in a particular direction
    this.movingCounters = new Map<GameInputMove, number>([
      [GameInput.Up, 0],
      [GameInput.Down, 0],
      [GameInput.Left, 0],
      [GameInput.Right, 0],
      [GameInput.RotateCW, 0],
      [GameInput.RotateCCW, 0]
    ]);
  }
  public getState(): InputRepeaterState {
    const { movingDirections, movingCounters } = this;
    return { movingDirections, movingCounters };
  }
  public setState() {}

  public tick(inputQueue: MoveInputEvent[] = []): GameInputMove[] {
    const { movingCounters, movingDirections } = this;
    const moveQueue: GameInputMove[] = [];

    for (const { input, eventType } of inputQueue) {
      if (eventType === InputEventType.KeyDown && !movingDirections.get(input)) {
        moveQueue.push(input);
        movingDirections.set(input, true);
      } else if (eventType === InputEventType.KeyUp) {
        movingDirections.delete(input);
      }
    }

    for (const inputStr of Array.from(movingDirections.keys())) {
      const input = inputStr as GameInputMove;
      if (
        movingCounters.has(input) &&
        (movingCounters.get(input) as number) >= repeatIntervals[input]
      ) {
        moveQueue.push(input);
        movingCounters.set(input, 0);
      }
    }

    // update moving counters
    for (const inputType of Array.from(this.movingCounters.keys())) {
      if (movingDirections.has(inputType)) {
        movingCounters.set(inputType, (movingCounters.get(inputType) as number) + 1);
      } else {
        movingCounters.set(inputType, 0);
      }
    }

    return moveQueue;
  }
}
