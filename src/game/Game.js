import _  from 'lodash';
import {EventEmitter} from 'events';
import keyMirror from 'keymirror';
import StateMachine  from 'javascript-state-machine';

import {INPUTS, COLORS, GRAVITY_TABLE} from './../constants';
import {Playfield} from './Playfield';
import InputRepeater from './InputRepeater';
import {generatePillSequence} from './utils/generators';

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
    // callbacks called when grid changes, game is won, or game is lost
    onChange: _.noop,
    onWin: _.noop,
    onLose: _.noop
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
    {name: 'reconcile', from: [Game.modes.PLAYING, Game.modes.CASCADE], to: Game.modes.RECONCILE},
    {name: 'destroy', from: Game.modes.RECONCILE, to: Game.modes.DESTRUCTION},
    {name: 'cascade', from: [Game.modes.RECONCILE, Game.modes.DESTRUCTION], to: Game.modes.CASCADE},
    {name: 'ready', from: Game.modes.CASCADE, to: Game.modes.READY},
    {name: 'win', from: Game.modes.RECONCILE, to: Game.modes.ENDED},
    {name: 'lose', from: Game.modes.READY, to: Game.modes.ENDED},
    {name: 'reset', from: '*', to: Game.modes.LOADING}
  ];

  constructor(options = {}) {
    options = _.defaults({}, options, Game.defaultOptions);
    super(options);
    // assign all options to instance variables
    Object.assign(this, options);

    // finite state machine representing game mode
    this.modeMachine = StateMachine.create({
      initial: Game.modes.LOADING,
      events: Game.modeTransitions
    });
    // the grid, single source of truth for game playfield state
    this.playfield = new Playfield({width: options.width, height: options.height});
    // current score
    this.score = 0;
    // sequence of pill colors to use in the game, will be generated if not passed
    this.pillSequence = options.pillSequence || generatePillSequence(COLORS);

    // value representing pill fall speed, increases over time
    this.playSpeed = options.baseSpeed;
    // increments every 10 capsules to speed up over time
    this.speedCounter = 0;
    // lookup speed in gravityTable to get # of frames it takes to fall 1 row
    this.playGravity = gravityFrames(options.baseSpeed);
    // # of frames it takes debris to fall 1 row during cascade
    this.cascadeGravity = gravityFrames(options.cascadeSpeed);

    // counters, mostly used to count # of frames we've been in a particular state
    this.counters = {
      gameTicks: 0,
      playTicks: 0,
      cascadeTicks: 0,
      destroyTicks: 0,
      pillSequenceIndex: 0,
      pillCount: 0
    };

    // input repeater, takes raw inputs and repeats them if they are held down
    // returns the real sequence of moves used by the game
    this.inputRepeater = new InputRepeater();

    // attach event callbacks to be called when the mode machine transitions between states
    this.modeMachine.onplay = () => this.counters.playTicks = 0;
    this.modeMachine.ondestroy = () => this.counters.destroyTicks = 0;
    this.modeMachine.oncascade = () => this.counters.cascadeTicks = 0;
    this.modeMachine.onwin = () => this.onWin();
    this.modeMachine.onlose = () => this.onLose();
    //this.modeMachine.onenterstate = (event, lastMode, newMode) => {
    //    console.log('playfield mode transition:', event, lastMode, newMode);
    //};
    //this.modeMachine.onreset = (event, lastMode, newMode) => {};
  }

  doMoves(moveQueue) {
    let shouldReconcile = false;

    for(const input of moveQueue) {
      // move/rotate the pill based on the move input
      let didMove;

      if(input === INPUTS.UP) {
        didMove = this.playfield.slamPill();
        // reconcile immediately after slam
        shouldReconcile = true;

      } else if(_.includes([INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN], input)) {
        const direction = (input === INPUTS.DOWN) ? 'down' :
          (input === INPUTS.LEFT) ? 'left' : 'right';
        didMove = this.playfield.movePill(direction);

        // trying to move down, but couldn't; we are ready to reconcile
        if(input === INPUTS.DOWN && !didMove) shouldReconcile = true;

      } else if(_.includes([INPUTS.ROTATE_CCW, INPUTS.ROTATE_CW], input)) {
        const direction = (input === INPUTS.ROTATE_CCW) ? 'ccw' : 'cw';
        didMove = this.playfield.rotatePill(direction);
      }
    }

    return shouldReconcile;
  }

  tick(inputQueue) {
    // always handle move inputs, key can be released in any mode
    const moveQueue = this.inputRepeater.tick(inputQueue);

    // the main game loop, called once per game tick
    switch (this.modeMachine.current) {

      case Game.modes.LOADING:
        const generated = this.playfield.generateViruses(this.level);
        console.log('generated', generated);
        this.origVirusCount = generated.virusCount;
        this.modeMachine.loaded();
        break;

      case Game.modes.READY:
        this.cascadeLineCount = 0;
        // try to add a pill to the playfield
        if(this.givePill()) this.modeMachine.play();
        // if it didn't work, pill entrance is blocked and we lose
        else this.modeMachine.lose();
        break;

      case Game.modes.PLAYING:
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
          const didMove = this.playfield.movePill('down');
          if(!didMove) shouldReconcile = true;
        }

        // pill can't move any further, reconcile the board
        if(shouldReconcile) this.modeMachine.reconcile();
        break;

      case Game.modes.RECONCILE:
        // playfield is locked, check for same-color lines
        // setting them to destroyed if they are found
        const {hasLines, lines, destroyedCount, virusCount} = this.playfield.destroyLines();

        if(hasLines)  {
          this.cascadeLineCount += lines.length;
          this.score +=
            (Math.pow(destroyedCount, this.cascadeLineCount) * 5) +
            (virusCount * this.cascadeLineCount * 3 * 5);
        }

        // const hadLines = this.playfield.destroyLines();
        const hasViruses = this.playfield.hasViruses();

        // killed all viruses, you win
        if(!hasViruses) {
          const expectedTicks = this.origVirusCount * 400;
          this.timeBonus = Math.max(0, expectedTicks - this.counters.gameTicks);
          this.score += this.timeBonus;
          this.modeMachine.win();
        }
        // lines are being destroyed, go to destroy mode
        else if(hasLines) this.modeMachine.destroy();
        // no lines, cascade falling debris
        else this.modeMachine.cascade();
        break;

      case Game.modes.DESTRUCTION:
        // stay in destruction state a few ticks to animate destruction
        if(this.counters.destroyTicks >= this.destroyTicks) {
          // empty the destroyed cells
          this.playfield.removeDestroyed();
          this.modeMachine.cascade();
        }
        this.counters.destroyTicks++;
        break;

      case Game.modes.CASCADE:
        if(this.counters.cascadeTicks === 0) {
          // check if there is any debris to drop
          let {fallingCells} = this.playfield.flagFallingCells();
          // nothing to drop, ready for another pill
          if(!fallingCells.length) this.modeMachine.ready();

        } else if(this.counters.cascadeTicks % this.cascadeGravity === 0) {
          // drop the cells for the current cascade
          const dropped = this.playfield.dropDebris();
          // compute the next cascade
          // flag falling cells for next cascade so they are excluded by reconciler
          // (falling pieces cant make lines)
          const next = this.playfield.flagFallingCells();

          if(next.fallingCells.length < dropped.fallingCells.length) {
            // some of the falling cells from this cascade have stopped
            // so we need to reconcile them (look for lines)
            this.modeMachine.reconcile();
          }
        }
        this.counters.cascadeTicks++;
        break;

      case Game.modes.ENDED:
        console.log('ended!');
        break;
    }
  }

  givePill() {
    const pillColors = this.pillSequence[this.counters.pillSequenceIndex];
    // try to add a new pill, false if blocked
    const didGive = this.playfield.givePill(pillColors);

    if(didGive) {
      this.counters.pillSequenceIndex++; // todo no need to save this it can be derived from pillcount % length
      if(this.counters.pillSequenceIndex == this.pillSequence.length) this.counters.pillSequenceIndex = 0;
      this.counters.pillCount++;
    }
    return didGive;
  }
}
