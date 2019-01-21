import { EventEmitter } from "events";
import StateMachine from "ts-javascript-state-machine";
import * as _ from "lodash";

import { COLORS, GRAVITY_TABLE, PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./constants";
import {
  Direction,
  GameGrid,
  GameInput,
  GameInputMove,
  GameMode,
  MoveInputEvent,
  PillColors,
  PillLocation,
  RotateDirection
} from "./types";

import { generateEnemies, generatePillSequence, makeEmptyGrid } from "./utils/generators";
import { hasViruses } from "./utils/grid";
import {
  clearTopRow,
  destroyLines,
  dropDebris,
  flagFallingCells,
  givePill,
  movePill,
  removeDestroyed,
  rotatePill,
  slamPill
} from "./utils/moves";

import InputRepeater from "./InputRepeater";
import { isPillLocation } from "./utils/guards";

function gravityFrames(speed: number): number {
  return GRAVITY_TABLE[Math.min(speed, GRAVITY_TABLE.length - 1)];
}

// options that can be passed to control game parameters
export interface GameOptions {
  level: number;
  baseSpeed: number;
  pillSequence?: PillColors[];
  width: number;
  height: number;
  cascadeSpeed: number;
  destroyTicks: number;
  accelerateInterval: number;
  onChange: () => void;
  onWin: () => void;
  onLose: () => void;
}

export interface GameCounters {
  gameTicks: number;
  playTicks: number;
  cascadeTicks: number;
  destroyTicks: number;
  pillCount: number;
}

// options that can be passed to control game parameters
export const defaultGameOptions: GameOptions = {
  // current virus level (generally 1-20)
  level: 0,
  // value representing pill fall speed, increases over time
  baseSpeed: 15,
  // sequence of pill colors to use, will be generated if not passed
  pillSequence: undefined,
  // width and height of grid (# of grid squares)
  width: PLAYFIELD_WIDTH,
  height: PLAYFIELD_HEIGHT,
  // debris fall speed, constant
  cascadeSpeed: 20,
  // time delay (in # of ticks) pills being destroyed stay in "destroyed" state before cascading
  destroyTicks: 20,
  // after every accelerateInterval pills, gravity speed is increased by one
  accelerateInterval: 10,
  // callbacks called when grid changes, game is won, or game is lost
  onChange: _.noop,
  onWin: _.noop,
  onLose: _.noop
};

// transitions between modes (state machine states)
export enum GameTransitionType {
  Loaded = "loaded",
  Play = "play",
  Reconcile = "reconcile",
  Destroy = "destroy",
  Cascade = "cascade",
  Ready = "ready",
  Win = "win",
  Lose = "lose",
  Reset = "reset"
}
interface GameModeTransition {
  name: GameTransitionType;
  from: GameMode | GameMode[] | string | string[];
  to: GameMode;
}

export const gameModeTransitions: GameModeTransition[] = [
  { name: GameTransitionType.Loaded, from: GameMode.Loading, to: GameMode.Ready },
  { name: GameTransitionType.Play, from: GameMode.Ready, to: GameMode.Playing },
  {
    name: GameTransitionType.Reconcile,
    from: [GameMode.Playing, GameMode.Cascade],
    to: GameMode.Reconcile
  },
  { name: GameTransitionType.Destroy, from: GameMode.Reconcile, to: GameMode.Destruction },
  {
    name: GameTransitionType.Cascade,
    from: [GameMode.Reconcile, GameMode.Destruction],
    to: GameMode.Cascade
  },
  { name: GameTransitionType.Ready, from: GameMode.Cascade, to: GameMode.Ready },
  { name: GameTransitionType.Win, from: GameMode.Reconcile, to: GameMode.Ended },
  { name: GameTransitionType.Lose, from: GameMode.Ready, to: GameMode.Ended },
  { name: GameTransitionType.Reset, from: "*", to: GameMode.Loading }
];

export default class Game extends EventEmitter {
  // game modes, used by the state machine
  // Loading: pre-ready state, todo: use this to populate viruses slowly?
  // Ready: ready for a new pill (first or otherwise)
  // Playing: pill is in play and falling
  // Reconcile: pill is locked in place, checking for lines to destroy
  // Cascade: cascading line destruction & debris falling
  // Destruction: lines are being destroyed
  // Ended: game has ended

  public static createInitialGrid(width: number, height: number, level: number) {
    return generateEnemies(makeEmptyGrid(width, height + 1), level, COLORS);
  }

  public options: GameOptions;
  // todo figure out statemachine typing
  public modeMachine: any;
  public grid: GameGrid<number, number>;
  public pill?: PillLocation;
  public origVirusCount: number;
  public pillSequence: PillColors[];
  public playGravity: number;
  public cascadeGravity: number;
  // current score
  public score: number = 0;
  public timeBonus: number = 0;
  // counters, mostly used to count # of frames we've been in a particular state
  public counters: GameCounters;
  private inputRepeater: InputRepeater;
  private cascadeLineCount: number = 0;

  constructor(passedOptions: Partial<GameOptions> = {}) {
    super();
    const options: GameOptions = _.defaults({}, passedOptions, defaultGameOptions);

    // assign all options to instance variables
    this.options = options;

    // finite state machine representing game mode
    this.modeMachine = this._initModeMachine();

    // the grid, single source of truth for game playfield state
    const { grid, virusCount } = Game.createInitialGrid(
      options.width,
      options.height,
      options.level
    );
    this.grid = grid;
    this.origVirusCount = virusCount;

    // sequence of pill colors to use in the game, will be generated if not passed
    this.pillSequence = options.pillSequence || generatePillSequence(COLORS);

    // lookup speed in gravityTable to get # of frames it takes to fall 1 row
    // increases over time due to accelerateInterval
    this.playGravity = gravityFrames(options.baseSpeed);
    // # of frames it takes debris to fall 1 row during cascade
    this.cascadeGravity = gravityFrames(options.cascadeSpeed);

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
  }

  public _initModeMachine() {
    console.log("AGH", StateMachine);
    // finite state machine representing game mode
    const modeMachine = new StateMachine({
      init: GameMode.Loading,
      transitions: gameModeTransitions,
      methods: {
        onPlay: () => (this.counters.playTicks = 0),
        onDestroy: () => (this.counters.destroyTicks = 0),
        onCascade: () => (this.counters.cascadeTicks = 0),
        onWin: () => this.options.onWin(),
        onLose: () => this.options.onLose()
      }
    });

    // modeMachine.onenterstate = (event, lastMode, newMode) => {
    //    console.log('playfield mode transition:', event, lastMode, newMode);
    // };
    // modeMachine.onreset = (event, lastMode, newMode) => {};

    return modeMachine;
  }

  public tick(inputQueue: MoveInputEvent[]) {
    // always handle move inputs, key can be released in any mode
    const moveQueue: GameInputMove[] = this.inputRepeater.tick(inputQueue);

    // the main game loop, called once per game tick
    switch (this.modeMachine.state) {
      case GameMode.Loading:
        return this._tickLoading();
      case GameMode.Ready:
        return this._tickReady();
      case GameMode.Playing:
        return this._tickPlaying(moveQueue);
      case GameMode.Reconcile:
        return this._tickReconcile();
      case GameMode.Destruction:
        return this._tickDestruction();
      case GameMode.Cascade:
        return this._tickCascade();
      case GameMode.Ended:
        console.log("ended!");
        return;
    }
  }

  public _tickReconcile() {
    // clear the true top row, in case any pills have been rotated up into it and stuck into place
    // do this first to ensure player can't get lines from it
    this.grid = clearTopRow(this.grid);

    // playfield is locked, check for same-color lines
    // setting them to destroyed if they are found
    const { grid, lines, hasLines, destroyedCount, virusCount } = destroyLines(this.grid);
    this.grid = grid;

    if (hasLines) {
      this.cascadeLineCount += lines.length;
      this.score +=
        Math.pow(destroyedCount, this.cascadeLineCount) * 5 +
        Math.pow(virusCount, this.cascadeLineCount) * 3 * 5;
    }

    const gridHasViruses = hasViruses(this.grid);

    // killed all viruses, you win
    if (!gridHasViruses) {
      // lower levels get a bit more expected time (higher time bonus)
      // because viruses are far apart, bonus is harder to get
      const expectedTicksPerVirus = 320 + Math.max(0, 40 - this.origVirusCount) * 3;
      const expectedTicks = this.origVirusCount * expectedTicksPerVirus;
      this.timeBonus = Math.max(0, expectedTicks - this.counters.gameTicks);
      this.score += this.timeBonus;
      this.modeMachine.win();
    }
    // lines are being destroyed, go to destroy mode
    else if (hasLines) {
      this.modeMachine.destroy();
    }
    // no lines, cascade falling debris
    else {
      this.modeMachine.cascade();
    }
  }

  public _tickDestruction() {
    // stay in destruction state a few ticks to animate destruction
    if (this.counters.destroyTicks >= this.options.destroyTicks) {
      // empty the destroyed cells
      this.grid = removeDestroyed(this.grid);
      this.modeMachine.cascade();
    }
    this.counters.destroyTicks++;
  }

  public _tickCascade() {
    if (this.counters.cascadeTicks === 0) {
      // check if there is any debris to drop
      const { grid, fallingCells } = flagFallingCells(this.grid);
      this.grid = grid;
      // nothing to drop, ready for another pill
      if (!fallingCells.length) {
        this.modeMachine.ready();
      }
    } else if (this.counters.cascadeTicks % this.cascadeGravity === 0) {
      // drop the cells for the current cascade
      const dropped = dropDebris(this.grid);
      this.grid = dropped.grid;
      // compute the next cascade
      // flag falling cells for next cascade so they are excluded by reconciler
      // (falling pieces cant make lines)
      const next = flagFallingCells(this.grid);
      this.grid = next.grid;

      if (next.fallingCells.length < dropped.fallingCells.length) {
        // some of the falling cells from this cascade have stopped
        // so we need to reconcile them (look for lines)
        this.modeMachine.reconcile();
      }
    }
    this.counters.cascadeTicks++;
  }

  private _tickLoading() {
    this.modeMachine.loaded();
  }

  private _tickReady() {
    this.cascadeLineCount = 0;

    // try to add a new pill
    const { pillCount } = this.counters;
    const pillSequenceIndex = pillCount % this.pillSequence.length;
    const pillColors = this.pillSequence[pillSequenceIndex];
    const { grid, pill, didGive } = givePill(this.grid, pillColors);
    Object.assign(this, { grid, pill });

    if (didGive) {
      // got a new pill!
      this.counters.pillCount++;

      // update speed to match # of given pills
      const speed =
        this.options.baseSpeed +
        Math.floor(this.counters.pillCount / this.options.accelerateInterval);
      this.playGravity = gravityFrames(speed);

      this.modeMachine.play();
    } else {
      // didn't get a pill, the entrance is blocked and we lose
      this.modeMachine.lose();
    }
  }

  private _tickPlaying(moveQueue: GameInputMove[]) {
    // game is playing, pill is falling & under user control
    // todo speedup
    this.counters.playTicks++;
    this.counters.gameTicks++;

    // do the moves created by the inputRepeater
    let shouldReconcile = this.doMoves(moveQueue);

    // gravity pulling pill down
    if (
      this.counters.playTicks > this.playGravity &&
      !this.inputRepeater.movingDirections.has(GameInput.Down)
    ) {
      // deactivate gravity while moving down
      this.counters.playTicks = 0;
      if (isPillLocation(this.pill)) {
        const moved = movePill(this.grid, this.pill, Direction.Down);
        if (!moved.didMove) {
          shouldReconcile = true;
        } else {
          this.grid = moved.grid;
          this.pill = moved.pill;
        }
      }
    }

    // pill can't move any further, reconcile the board
    if (shouldReconcile) {
      this.modeMachine.reconcile();
    }
  }

  private doMoves(moveQueue: GameInputMove[]) {
    if (!isPillLocation(this.pill)) {
      return false;
    }

    let shouldReconcile: boolean = false;

    for (const input of moveQueue) {
      // move/rotate the pill based on the move input
      let grid: GameGrid<number, number> = this.grid;
      let pill: PillLocation = this.pill;
      let didMove: boolean = false;

      if (input === GameInput.Up) {
        const slammed = slamPill(this.grid, this.pill);
        grid = slammed.grid;
        pill = slammed.pill;
        didMove = slammed.didMove;
        // reconcile immediately after slam
        shouldReconcile = true;
      } else if (_.includes([GameInput.Left, GameInput.Right, GameInput.Down], input)) {
        const direction =
          input === GameInput.Down
            ? Direction.Down
            : input === GameInput.Left
            ? Direction.Left
            : Direction.Right;

        const moved = movePill(this.grid, this.pill, direction);
        grid = moved.grid;
        pill = moved.pill;
        didMove = moved.didMove;
        // trying to move down, but couldn't; we are ready to reconcile
        if (input === GameInput.Down && !didMove) {
          shouldReconcile = true;
        }
      } else if (_.includes([GameInput.RotateCCW, GameInput.RotateCW], input)) {
        const direction: RotateDirection =
          input === GameInput.RotateCCW
            ? RotateDirection.CounterClockwise
            : RotateDirection.Clockwise;

        const rotated = rotatePill(this.grid, this.pill, direction);
        grid = rotated.grid;
        pill = rotated.pill;
        didMove = rotated.didMove;
      }

      if (didMove) {
        this.grid = grid;
        this.pill = pill;
      }
    }

    return shouldReconcile;
  }
}
