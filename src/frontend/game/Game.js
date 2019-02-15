import _  from 'lodash';
import {EventEmitter} from 'events';
import keyMirror from 'keymirror';
import StateMachine  from 'javascript-state-machine';

import {INPUTS, COLORS, GRAVITY_TABLE} from './constants';
import InputRepeater from './InputRepeater';

import {generatePillSequence, emptyGrid, generateEnemies} from './utils/generators';
import {hasViruses} from './utils/grid';
import
  {givePill, movePill, slamPill, rotatePill, dropDebris, flagFallingCells, destroyLines, removeDestroyed, clearTopRow, giveGarbage}
from './utils/moves';


function gravityFrames(speed) {
  return GRAVITY_TABLE[Math.min(speed, GRAVITY_TABLE.length - 1)];
}

export default class Game extends EventEmitter {
  // options that can be passed to control game parameters
  static defaultOptions = {
    // current virus level (generally 1-20)
    level: 0,
    // value representing pill fall speed, increases over time
    baseSpeed: 15,
    // sequence of pill colors to use, will be generated if not passed
    pillSequence: undefined,
    // width and height of grid (# of grid squares)
    width: 8,
    height: 16,
    // debris fall speed, constant
    cascadeSpeed: 20,
    // time delay (in # of ticks) pills being destroyed stay in "destroyed" state before cascading
    destroyTicks: 20,
    // after every accelerateInterval pills, gravity speed is increased by one
    accelerateInterval: 10,
    // callbacks called when grid changes, game is won, or game is lost
    onChange: _.noop,
    onWin: _.noop,
    onLose: _.noop,
    // called when player gets a combo (2 or more lines at once/in the same cascade)
    onCombo: _.noop
  };

  // game modes, used by the state machine
  static modes = keyMirror({
    // pre-ready state, todo: use this to populate viruses slowly?
    LOADING: null,
    // ready for a new pill (first or otherwise)
    READY: null,
    // pill is in play and falling
    PLAYING: null,
    // pill is locked in place, checking for lines to destroy
    RECONCILE: null,
    // cascading line destruction & debris falling
    CASCADE: null,
    // lines are being destroyed
    DESTRUCTION: null,
    // game has ended
    ENDED: null
  });

  // transitions between modes (state machine states)
  static modeTransitions = [
    {name: 'loaded', from: Game.modes.LOADING, to: Game.modes.READY},
    {name: 'play', from: Game.modes.READY, to: Game.modes.PLAYING},
    {name: 'reconcile', from: [Game.modes.PLAYING, Game.modes.CASCADE, Game.modes.READY], to: Game.modes.RECONCILE},
    {name: 'destroy', from: Game.modes.RECONCILE, to: Game.modes.DESTRUCTION},
    {name: 'cascade', from: [Game.modes.RECONCILE, Game.modes.DESTRUCTION], to: Game.modes.CASCADE},
    {name: 'ready', from: Game.modes.CASCADE, to: Game.modes.READY},
    // single player games can only win from RECONCILE, but multiplayer games can win at any time (if other player dies)
    {name: 'win', from: '*', to: Game.modes.ENDED},
    // single player games can only lose from READY, but multiplayer games can lose at any time (if other player wins)
    {name: 'lose', from: '*', to: Game.modes.ENDED},
    {name: 'reset', from: '*', to: Game.modes.LOADING}
  ];
  
  static createInitialGrid(width, height, level) {
    return generateEnemies(emptyGrid(width, height + 1), level, COLORS);
  }

  constructor(options = {}) {
    options = _.defaults({}, options, Game.defaultOptions);
    super(options);
    // assign all options to instance variables
    Object.assign(this, options);

    // finite state machine representing game mode
    this.modeMachine = this._initModeMachine();

    // the grid, single source of truth for game playfield state
    const {grid, virusCount} = Game.createInitialGrid(options.width, options.height, options.level);
    Object.assign(this, {grid, origVirusCount: virusCount});

    // current score
    this.score = 0;
    // sequence of pill colors to use in the game, will be generated if not passed
    this.pillSequence = options.pillSequence || generatePillSequence(COLORS);

    // lookup speed in gravityTable to get # of frames it takes to fall 1 row
    // increases over time due to accelerateInterval
    this.playGravity = gravityFrames(options.baseSpeed);
    // # of frames it takes debris to fall 1 row during cascade
    this.cascadeGravity = gravityFrames(options.cascadeSpeed);

    // counters, mostly used to count # of frames we've been in a particular state
    this.counters = {
      gameTicks: 0,
      playTicks: 0,
      cascadeTicks: 0,
      destroyTicks: 0,
      pillCount: 0
    };

    // input repeater, takes raw inputs and repeats them if they are held down
    // returns the real sequence of moves used by the game
    this.inputRepeater = new InputRepeater();

    // queue of "garbage" colors to be added to the game on next READY state (from multiplayer game controller)
    this.garbageQueue = [];
  }

  _initModeMachine() {
    // finite state machine representing game mode
    const modeMachine = new StateMachine({
      init: Game.modes.LOADING,
      transitions: Game.modeTransitions,
      methods: {
        onPlay: () => this.counters.playTicks = 0,
        onDestroy: () => this.counters.destroyTicks = 0,
        onCascade: () => this.counters.cascadeTicks = 0,
        onWin: () => this.onWin(),
        onLose: () => this.onLose()
      }
    });

    //modeMachine.onenterstate = (event, lastMode, newMode) => {
    //    console.log('playfield mode transition:', event, lastMode, newMode);
    //};
    //modeMachine.onreset = (event, lastMode, newMode) => {};

    return modeMachine;
  }

  doMoves(moveQueue) {
    let shouldReconcile = false;

    for(const input of moveQueue) {
      // move/rotate the pill based on the move input
      let grid, pill, didMove;

      if(input === INPUTS.UP) {
        ({grid, pill, didMove} = slamPill(this.grid, this.pill));
        // reconcile immediately after slam
        shouldReconcile = true;

      } else if(_.includes([INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN], input)) {
        const direction =
          (input === INPUTS.DOWN) ? 'down' :
          (input === INPUTS.LEFT) ? 'left' : 'right';

        ({grid, pill, didMove} = movePill(this.grid, this.pill, direction));

        // trying to move down, but couldn't; we are ready to reconcile
        if(input === INPUTS.DOWN && !didMove) shouldReconcile = true;

      } else if(_.includes([INPUTS.ROTATE_CCW, INPUTS.ROTATE_CW], input)) {
        const direction = (input === INPUTS.ROTATE_CCW) ? 'ccw' : 'cw';

        ({grid, pill, didMove} = rotatePill(this.grid, this.pill, direction));
      }

      if(didMove) Object.assign(this, {grid, pill});
    }

    return shouldReconcile;
  }

  addGarbage(colors) {
    // game controller can call this method to add "garbage" to the game (aka "drop")
    // (ie. in response to a combo from another player)
    this.garbageQueue.push(colors);
  }

  tick(inputQueue) {
    // always handle move inputs, key can be released in any mode
    const moveQueue = this.inputRepeater.tick(inputQueue);

    // the main game loop, called once per game tick
    switch (this.modeMachine.state) {
      case Game.modes.LOADING:
        return this._tickLoading();
      case Game.modes.READY:
        return this._tickReady();
      case Game.modes.PLAYING:
        return this._tickPlaying(moveQueue);
      case Game.modes.RECONCILE:
        return this._tickReconcile();
      case Game.modes.DESTRUCTION:
        return this._tickDestruction();
      case Game.modes.CASCADE:
        return this._tickCascade();
      case Game.modes.ENDED:
        console.log('ended!');
        return;
    }
  }

  _tickLoading() {
    this.modeMachine.loaded();
  }

  _tickReady() {
    // call onCombo if we made at least 2 lines in the last cascade
    if(this.cascadeLineCount >= 2) {
      this.onCombo(this.cascadeLineColors);
    }
    this.cascadeLineCount = 0;
    this.cascadeLineColors = [];

    // if we have garbage in the queue, it gets added & dropped before we get a new pill
    if(this.garbageQueue.length) {
      const garbageColors = this.garbageQueue.shift();
      const {grid} = giveGarbage(this.grid, garbageColors);
      Object.assign(this, {grid});

      // reconcile the grid to check for lines & cascade the garbage
      this.modeMachine.reconcile();
      return;
    }

    // try to add a new pill
    const {pillCount} = this.counters;
    const pillSequenceIndex = pillCount % this.pillSequence.length;
    const pillColors = this.pillSequence[pillSequenceIndex];
    const {grid, pill, didGive} = givePill(this.grid, pillColors);
    Object.assign(this, {grid, pill});

    if(didGive) {
      // got a new pill!
      this.counters.pillCount++;

      // update speed to match # of given pills
      const speed = this.baseSpeed + Math.floor(this.counters.pillCount / this.accelerateInterval);
      this.playGravity = gravityFrames(speed);

      this.modeMachine.play();
    } else {
      // didn't get a pill, the entrance is blocked and we lose
      this.modeMachine.lose();
    }
  }

  _tickPlaying(moveQueue) {
    // game is playing, pill is falling & under user control
    // todo speedup
    this.counters.playTicks++;
    this.counters.gameTicks++;

    // do the moves created by the inputRepeater
    let shouldReconcile = this.doMoves(moveQueue);

    // gravity pulling pill down
    if(this.counters.playTicks > this.playGravity
      && !this.inputRepeater.movingDirections.has(INPUTS.DOWN)) { // deactivate gravity while moving down
      this.counters.playTicks = 0;
      const {grid, pill, didMove} = movePill(this.grid, this.pill, 'down');
      if(!didMove) shouldReconcile = true;
      else Object.assign(this, {grid, pill});
    }

    // pill can't move any further, reconcile the board
    if(shouldReconcile) this.modeMachine.reconcile();
  }

  _tickReconcile() {
    // clear the true top row, in case any pills have been rotated up into it and stuck into place
    // do this first to ensure player can't get lines from it
    this.grid = clearTopRow(this.grid);

    // playfield is locked, check for same-color lines
    // setting them to destroyed if they are found
    const {grid, lines, lineColors, hasLines, destroyedCount, virusCount} = destroyLines(this.grid);
    this.grid = grid;

    if(hasLines)  {
      this.cascadeLineCount += lines.length;
      this.cascadeLineColors = (this.cascadeLineColors || []).concat(lineColors);
      this.score +=
        (Math.pow(destroyedCount, this.cascadeLineCount) * 5) +
        (Math.pow(virusCount, this.cascadeLineCount) * 3 * 5);
    }

    const gridHasViruses = hasViruses(this.grid);

    // killed all viruses, you win
    if(!gridHasViruses) {
      // lower levels get a bit more expected time (higher time bonus)
      // because viruses are far apart, bonus is harder to get
      const expectedTicksPerVirus = 320 + (Math.max(0, 40 - this.origVirusCount) * 3);
      const expectedTicks = this.origVirusCount * expectedTicksPerVirus;
      this.timeBonus = Math.max(0, expectedTicks - this.counters.gameTicks);
      this.score += this.timeBonus;
      this.modeMachine.win();
    }
    // lines are being destroyed, go to destroy mode
    else if(hasLines) this.modeMachine.destroy();
    // no lines, cascade falling debris
    else this.modeMachine.cascade();
  }

  _tickDestruction() {
    // stay in destruction state a few ticks to animate destruction
    if(this.counters.destroyTicks >= this.destroyTicks) {
      // empty the destroyed cells
      this.grid = removeDestroyed(this.grid);
      this.modeMachine.cascade();
    }
    this.counters.destroyTicks++;
  }

  _tickCascade() {
    if(this.counters.cascadeTicks === 0) {
      // check if there is any debris to drop
      const {grid, fallingCells} = flagFallingCells(this.grid);
      Object.assign(this, {grid});
      // nothing to drop, ready for another pill
      if(!fallingCells.length) this.modeMachine.ready();

    } else if(this.counters.cascadeTicks % this.cascadeGravity === 0) {
      // drop the cells for the current cascade
      const dropped = dropDebris(this.grid);
      this.grid = dropped.grid;
      // compute the next cascade
      // flag falling cells for next cascade so they are excluded by reconciler
      // (falling pieces cant make lines)
      const next = flagFallingCells(this.grid);
      this.grid = next.grid;

      if(next.fallingCells.length < dropped.fallingCells.length) {
        // some of the falling cells from this cascade have stopped
        // so we need to reconcile them (look for lines)
        this.modeMachine.reconcile();
      }
    }
    this.counters.cascadeTicks++;
  }
}
