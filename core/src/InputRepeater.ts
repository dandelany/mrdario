import { INPUT_REPEAT_INTERVALS } from "./constants";
import {
  GameInput,
  GameInputMove,
  InputEventType,
  MoveInputEvent,
  MoveInputNumberMap
} from "./types";

// the # of frames for which an input must be held down until it repeats.
// different for each input, based on empirical testing
export const repeatIntervals: MoveInputNumberMap = INPUT_REPEAT_INTERVALS;

export default class InputRepeater {
  public movingCounters: MoveInputNumberMap;
  public movingDirections: Set<GameInputMove>;

  constructor() {
    // the directions we are currently moving, while a move key is held down
    this.movingDirections = new Set<GameInputMove>();

    // these counters count up while a move key is held down (for normalizing key-repeat)
    // ie. represents the # of frames during which we have been moving in a particular direction
    this.movingCounters = {
      [GameInput.Up]: 0,
      [GameInput.Down]: 0,
      [GameInput.Left]: 0,
      [GameInput.Right]: 0,
      [GameInput.RotateCCW]: 0,
      [GameInput.RotateCW]: 0
    };
  }

  public tick(inputQueue: MoveInputEvent[] = []): GameInputMove[] {
    const { movingCounters, movingDirections } = this;
    const moveQueue: GameInputMove[] = [];

    for (const { input, eventType } of inputQueue) {
      if (eventType === InputEventType.KeyDown && !movingDirections.has(input)) {
        moveQueue.push(input);
        movingDirections.add(input);
      } else if (eventType === InputEventType.KeyUp) {
        movingDirections.delete(input);
      }
    }

    for (const input of movingDirections) {
      if (movingCounters[input] >= repeatIntervals[input]) {
        moveQueue.push(input);
        movingCounters[input] = 0;
      }
    }

    // update moving counters
    for (const inputType of Object.keys(movingCounters)) {
      movingDirections.has(inputType as GameInputMove)
        ? movingCounters[inputType]++
        : (movingCounters[inputType] = 0);
    }

    return moveQueue;
  }
}
