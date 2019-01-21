import {INPUTS} from './constants';

export default class InputRepeater {
  // the # of frames for which an input must be held down until it repeats.
  // different for each input, based on empirical testing
  static repeatIntervals = {
    [INPUTS.Up]: 24,
    [INPUTS.Down]: 4,
    [INPUTS.Left]: 8,
    [INPUTS.Right]: 8,
    [INPUTS.RotateCCW]: 12,
    [INPUTS.RotateCW]: 12
  };
  
  constructor() {
    // the directions we are currently moving, while a move key is held down
    this.movingDirections = new Set();
    
    // these counters count up while a move key is held down (for normalizing key-repeat)
    // ie. represents the # of frames during which we have been moving in a particular direction
    this.movingCounters = {
      [INPUTS.Up]: 0,
      [INPUTS.Down]: 0,
      [INPUTS.Left]: 0,
      [INPUTS.Right]: 0,
      [INPUTS.RotateCCW]: 0,
      [INPUTS.RotateCW]: 0
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
