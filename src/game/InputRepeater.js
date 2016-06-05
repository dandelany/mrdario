import {INPUTS} from './../constants';

export default class InputRepeater {
  static repeatIntervals = {
    [INPUTS.UP]: 12,
    [INPUTS.DOWN]: 4,
    [INPUTS.LEFT]: 8,
    [INPUTS.RIGHT]: 8,
    [INPUTS.ROTATE_CCW]: 12,
    [INPUTS.ROTATE_CW]: 12
  };
  
  constructor() {
    // the directions we are currently moving, while a move key is held down
    this.movingDirections = new Set();
    
    // these counters count up while a move key is held down (for normalizing key-repeat)
    // ie. represents the # of frames during which we have been moving in a particular direction
    this.movingCounters = {
      [INPUTS.UP]: 0,
      [INPUTS.DOWN]: 0,
      [INPUTS.LEFT]: 0,
      [INPUTS.RIGHT]: 0,
      [INPUTS.ROTATE_CCW]: 0,
      [INPUTS.ROTATE_CW]: 0
    };
  }
  
  tick(inputQueue = []) {
    let moveQueue = [];
    
    for(const {input, eventType} of inputQueue) {
      if(eventType === 'keydown' && !this.movingDirections.has(input)) {
        moveQueue.push(input);
        this.movingDirections.add(input);
        
      } else if(eventType === "keyup") {
        this.movingDirections.delete(input);
      }
    }
    
    for(const input of this.movingDirections) {
      if(this.movingCounters[input] >= InputRepeater.repeatIntervals[input]) {
        moveQueue.push(input);
        this.movingCounters[input] = 0;
      }
    }
    
    this._updateMoveCounters();
    
    return moveQueue;
  }

  _updateMoveCounters() {
    _.each(this.movingCounters, (count, inputType) => {
      this.movingDirections.has(inputType) ?
        this.movingCounters[inputType]++ :
        this.movingCounters[inputType] = 0;
    });
  }
}
