import {GameInput} from './constants';

export default class InputRepeater {
  // the # of frames for which an input must be held down until it repeats.
  // different for each input, based on empirical testing
  static repeatIntervals = {
    [GameInput.Up]: 24,
    [GameInput.Down]: 4,
    [GameInput.Left]: 8,
    [GameInput.Right]: 8,
    [GameInput.RotateCCW]: 12,
    [GameInput.RotateCW]: 12
  };
  
  constructor() {
    // the directions we are currently moving, while a move key is held down
    this.movingDirections = new Set();
    
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
  
  tick(inputQueue = []) {
    const {movingCounters, movingDirections} = this;
    let moveQueue = [];
    
    for(const {input, eventType} of inputQueue) {
      if(eventType === 'keydown' && !movingDirections.has(input)) {
        moveQueue.push(input);
        movingDirections.add(input);

      } else if(eventType === "keyup") {
        movingDirections.delete(input);
      }
    }
    
    for(const input of movingDirections) {
      if(movingCounters[input] >= InputRepeater.repeatIntervals[input]) {
        moveQueue.push(input);
        movingCounters[input] = 0;
      }
    }

    // update moving counters
    for(const inputType in movingCounters) {
      movingDirections.has(inputType) ?
        movingCounters[inputType]++ :
        movingCounters[inputType] = 0;
    }
    
    return moveQueue;
  }
}
