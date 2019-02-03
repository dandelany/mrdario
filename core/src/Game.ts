import { EventEmitter } from "events";
import { defaults, includes, noop } from "lodash";
import { TypeState } from "typestate";

import {
  ACCELERATE_INTERVAL,
  CASCADE_TICK_COUNT,
  COLORS,
  DESTROY_TICK_COUNT,
  GRAVITY_TABLE,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH
} from "./constants";
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
  givePill,
  movePill,
  removeDestroyed,
  rotatePill,
  slamPill
} from "./utils/moves";

import InputRepeater, {
  InputRepeaterState,
  MovingCounters,
  MovingDirections
} from "./InputRepeater";
import { isPillLocation } from "./utils/guards";

function gravityFrames(speed: number): number {
  return GRAVITY_TABLE[Math.min(speed, GRAVITY_TABLE.length - 1)];
}

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// options that can be passed to control game parameters
export interface GameOptions {
  level: number;
  baseSpeed: number;
  pillSequence?: PillColors[];
  width: number;
  height: number;
  seed?: string;
  onWin: () => void;
  onLose: () => void;
}
export type EncodableGameOptions = Omit<GameOptions, "onWin" | "onLose">;

export interface GameState {
  mode: GameMode;
  grid: GameGrid;
  pill?: PillLocation;
  pillSequence: PillColors[];
  movingCounters: MovingCounters;
  movingDirections: MovingDirections;
  seed: string;
  frame: number;
  score: number;
  timeBonus: number;
  gameTicks: number;
  modeTicks: number;
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
  // callbacks called when game is won or game is lost
  onWin: noop,
  onLose: noop
};

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
  public readonly options: GameOptions;
  protected fsm: TypeState.FiniteStateMachine<GameMode>;
  protected inputRepeater: InputRepeater;
  protected grid: GameGrid;
  protected pill?: PillLocation;
  protected pillSequence: PillColors[];
  protected origVirusCount: number;
  protected playGravity: number;
  protected cascadeGravity: number;
  protected score: number;
  protected frame: number;
  protected gameTicks: number;
  protected modeTicks: number;
  protected pillCount: number;
  protected timeBonus: number = 0;
  protected cascadeLineCount: number = 0;

  constructor(passedOptions: Partial<GameOptions> = {}) {
    super();
    const options: GameOptions = defaults({}, passedOptions, defaultGameOptions);
    this.options = options;

    // current frame #
    this.frame = 0;
    // the player's score
    this.score = 0;
    // finite state machine representing game mode
    this.fsm = this.initStateMachine();

    // the grid, single source of truth for game playfield state
    const { width, height, level } = this.options;
    const { grid, virusCount } = generateEnemies(makeEmptyGrid(width, height + 1), level, COLORS);
    this.grid = grid;
    this.origVirusCount = virusCount;

    // sequence of pill colors to use in the game, will be generated if not passed
    this.pillSequence = options.pillSequence || generatePillSequence(COLORS);

    // lookup speed in gravityTable to get # of frames it takes to fall 1 row
    // increases over time due to acceleration
    this.playGravity = gravityFrames(options.baseSpeed);
    // # of frames it takes debris to fall 1 row during cascade
    this.cascadeGravity = gravityFrames(CASCADE_TICK_COUNT);

    // counters, used to count # of frames we've been in a particular state
    this.gameTicks = 0;
    this.modeTicks = 0;
    // # of pills given since beginning of game
    this.pillCount = 0;

    // input repeater, takes raw inputs and repeats them if they are held down
    // returns the real sequence of moves used by the game
    this.inputRepeater = new InputRepeater();
  }

  public tick(inputQueue: MoveInputEvent[]) {
    this.frame++;
    // always handle move inputs, key can be released in any mode
    const moveQueue: GameInputMove[] = this.inputRepeater.tick(inputQueue);

    // the main game loop, called once per game tick
    switch (this.fsm.currentState) {
      case GameMode.Loading:
        return this.tickLoading();
      case GameMode.Ready:
        return this.tickReady();
      case GameMode.Playing:
        return this.tickPlaying(moveQueue);
      case GameMode.Reconcile:
        return this.tickReconcile();
      case GameMode.Destruction:
        return this.tickDestruction();
      case GameMode.Cascade:
        return this.tickCascade();
      case GameMode.Ended:
        // console.log("ended!");
        return;
    }
  }

  public getState(): GameState {
    const { grid, frame, pill, pillSequence, score, timeBonus } = this;
    const { pillCount, gameTicks, modeTicks } = this;
    // const { onWin, onLose, ...stateOptions } = options;
    const mode: GameMode = this.fsm.currentState;
    const inputRepeaterState: InputRepeaterState = this.inputRepeater.getState();
    const { movingCounters, movingDirections } = inputRepeaterState;

    return {
      mode,
      seed: 'a',
      frame,
      grid,
      pill,
      pillSequence,
      score,
      timeBonus,
      pillCount,
      gameTicks,
      modeTicks,
      movingCounters,
      movingDirections
      // options: stateOptions
      // todo input queue and input repeater
    };
  }

  private initStateMachine(): TypeState.FiniteStateMachine<GameMode> {
    // create state machine to keep track of current game mode
    const fsm = new TypeState.FiniteStateMachine<GameMode>(GameMode.Loading);

    // game modes, used by the state machine
    // Loading: pre-ready state, todo: use this to populate viruses slowly?
    // Ready: ready for a new pill (first or otherwise)
    // Playing: pill is in play and falling
    // Reconcile: pill is locked in place, checking for lines to destroy
    // Cascade: cascading line destruction & debris falling
    // Destruction: lines are being destroyed
    // Ended: game has ended

    // Loaded
    fsm.from(GameMode.Loading).to(GameMode.Ready);
    // Play
    fsm.from(GameMode.Ready).to(GameMode.Playing);
    // Reconcile
    fsm.from(GameMode.Playing, GameMode.Cascade).to(GameMode.Reconcile);
    // Destroy
    fsm.from(GameMode.Reconcile).to(GameMode.Destruction);
    // Cascade
    fsm.from(GameMode.Reconcile, GameMode.Destruction).to(GameMode.Cascade);
    // Ready
    fsm.from(GameMode.Cascade).to(GameMode.Ready);
    // Win
    fsm.from(GameMode.Reconcile).to(GameMode.Ended);
    // Lose
    fsm.from(GameMode.Ready).to(GameMode.Ended);
    // Reset
    fsm.fromAny(GameMode).to(GameMode.Loading);

    // onPlay
    fsm.on(GameMode.Playing, this.resetModeTicks);
    // onDestroy
    fsm.on(GameMode.Destruction, this.resetModeTicks);
    // onCascade
    fsm.on(GameMode.Cascade, this.resetModeTicks);
    fsm.on(GameMode.Ended, (from: GameMode | undefined) => {
      if (from === GameMode.Reconcile) {
        // onWin
        this.options.onWin();
      } else if (from === GameMode.Ready) {
        // onLose
        this.options.onLose();
      }
    });

    return fsm;
  }
  private resetModeTicks = () => {
    this.modeTicks = 0;
  };

  private tickLoading() {
    this.fsm.go(GameMode.Ready);
  }

  private tickReady() {
    this.cascadeLineCount = 0;

    // try to add a new pill
    const { pillCount } = this;
    const pillSequenceIndex = pillCount % this.pillSequence.length;
    const pillColors = this.pillSequence[pillSequenceIndex];
    const { grid, pill, didGive } = givePill(this.grid, pillColors);
    this.grid = grid;
    this.pill = pill;

    if (didGive) {
      // got a new pill!
      this.pillCount++;

      // update speed to match # of given pills
      // after every ACCELERATE_INTERVAL pills, gravity speed is increased by one
      const speed =
        this.options.baseSpeed + Math.floor(this.pillCount / ACCELERATE_INTERVAL);
      this.playGravity = gravityFrames(speed);

      this.fsm.go(GameMode.Playing);
    } else {
      // didn't get a pill, the entrance is blocked and we lose
      this.fsm.go(GameMode.Ended);
    }
  }

  private tickPlaying(moveQueue: GameInputMove[]) {
    // game is playing, pill is falling & under user control
    // todo speedup
    this.modeTicks++;
    this.gameTicks++;

    // do the moves created by the inputRepeater
    let shouldReconcile = this.doMoves(moveQueue);

    // gravity pulling pill down
    if (
      this.modeTicks > this.playGravity &&
      !this.inputRepeater.movingDirections[GameInput.Down]
    ) {
      // deactivate gravity while moving down
      this.modeTicks = 0;
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
      this.fsm.go(GameMode.Reconcile);
    }
  }

  private tickReconcile() {
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
      this.timeBonus = Math.max(0, expectedTicks - this.gameTicks);
      this.score += this.timeBonus;
      this.fsm.go(GameMode.Ended);
    }
    // lines are being destroyed, go to destroy mode
    else if (hasLines) {
      this.fsm.go(GameMode.Destruction);
    }
    // no lines, cascade falling debris
    else {
      this.fsm.go(GameMode.Cascade);
    }
  }

  private tickDestruction() {
    // stay in destruction state a few ticks to animate destruction
    if (this.modeTicks >= DESTROY_TICK_COUNT) {
      // empty the destroyed cells
      this.grid = removeDestroyed(this.grid);
      this.fsm.go(GameMode.Cascade);
      return;
    }
    this.modeTicks++;
  }

  private tickCascade() {
    if (this.modeTicks === 0) {
      // first cascade tick
      // check if there is any debris to drop
      const { fallingCells } = dropDebris(this.grid);
      // nothing to drop, ready for another pill
      if (!fallingCells.length) {
        this.fsm.go(GameMode.Ready);
        return;
      }
    } else if (this.modeTicks % this.cascadeGravity === 0) {
      // drop the cells for the current cascade
      const dropped = dropDebris(this.grid);
      this.grid = dropped.grid;
      // compute the next cascade to see if we're done
      // todo faster check?
      const next = dropDebris(this.grid);

      if (next.fallingCells.length < dropped.fallingCells.length) {
        // some of the falling cells from this cascade have stopped
        // so we need to reconcile them (look for lines)
        this.fsm.go(GameMode.Reconcile);
        return;
      }
    }
    this.modeTicks++;
  }

  private doMoves(moveQueue: GameInputMove[]) {
    if (!isPillLocation(this.pill)) {
      return false;
    }

    let shouldReconcile: boolean = false;

    for (const input of moveQueue) {
      // move/rotate the pill based on the move input
      let grid: GameGrid = this.grid;
      let pill: PillLocation = this.pill;
      let didMove: boolean = false;

      if (input === GameInput.Up) {
        const slammed = slamPill(this.grid, this.pill);
        grid = slammed.grid;
        pill = slammed.pill;
        didMove = slammed.didMove;
        // reconcile immediately after slam
        shouldReconcile = true;
      } else if (includes([GameInput.Left, GameInput.Right, GameInput.Down], input)) {
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
      } else if (includes([GameInput.RotateCCW, GameInput.RotateCW], input)) {
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
