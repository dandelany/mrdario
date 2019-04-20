import { EventEmitter } from "events";
import { defaults, includes } from "lodash";
import { TypeState } from "typestate";

import { InputRepeater } from "./InputRepeater";

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
  GameAction,
  GameActionMove,
  GameColor,
  GameGrid,
  GameInput,
  GameInputMove,
  GameMode,
  GameOptions,
  GameState,
  GameTickResult,
  GameTickResultType,
  GridDirection,
  PillColors,
  PillLocation,
  RotateDirection
} from "./types";
import {
  clearTopRow,
  destroyLines,
  dropDebris,
  generateEnemies,
  getLevelVirusCount,
  getNextPill,
  givePill,
  hasViruses,
  isMoveAction,
  isPillLocation,
  makeEmptyGrid,
  movePill,
  removeDestroyed,
  rotatePill,
  slamPill
} from "./utils";
import { encodeMoveAction } from "../encoding/action";

function gravityFrames(speed: number): number {
  return GRAVITY_TABLE[Math.min(speed, GRAVITY_TABLE.length - 1)];
}

// options that can be passed to control game parameters
export const defaultGameOptions: GameOptions = {
  // current virus level (generally 1-20)
  level: 0,
  // value representing pill fall speed, increases over time
  baseSpeed: 15,
  // width and height of grid (# of grid squares)
  width: PLAYFIELD_WIDTH,
  height: PLAYFIELD_HEIGHT
};

export class Game extends EventEmitter {
  // game modes, used by the state machine
  // Ready: pre-playing state, todo: use this to populate viruses slowly?
  // Playing: pill is in play and falling
  // Reconcile: pill is locked in place, checking for lines to destroy
  // Cascade: cascading line destruction & debris falling
  // Destruction: lines are being destroyed
  // Ended: game has ended

  public readonly options: GameOptions;
  // current frame #
  public frame: number = 0;
  protected fsm: TypeState.FiniteStateMachine<GameMode>;
  protected inputRepeater: InputRepeater;
  protected grid: GameGrid;
  protected pill?: PillLocation;
  protected nextPill: PillColors;
  protected seed: string;
  // counters, used to count # of frames we've been in a particular state
  protected gameTicks: number = 0;
  protected modeTicks: number = 0;
  // # of pills given since beginning of game
  protected pillCount: number = 0;
  // the player's score
  protected score: number = 0;
  protected timeBonus: number = 0;
  // protected comboLineCount: number = 0;
  protected lineColors: GameColor[] = [];

  constructor(passedOptions: Partial<GameOptions> = {}) {
    super();
    const options: GameOptions = defaults({}, passedOptions, defaultGameOptions);
    this.options = options;

    this.seed = options.initialSeed || Date.now().toString();
    // this.seed = "mrdario";

    this.nextPill = getNextPill(this.seed, this.pillCount);

    // finite state machine representing game mode
    this.fsm = this.initStateMachine();

    // the grid, single source of truth for game playfield state
    const { width, height, level } = this.options;
    const { grid } = generateEnemies(makeEmptyGrid(width, height + 1), level, COLORS, this.seed + "enemies");

    this.grid = grid;

    // input repeater, takes raw inputs and repeats them if they are held down
    // returns the real sequence of moves used by the game
    this.inputRepeater = new InputRepeater();
  }

  public tick(actions: GameAction[] = []): void | GameTickResult {
    this.frame++;
    const moveActions: GameActionMove[] = actions.filter(isMoveAction);
    const moveQueue: GameInputMove[] = this.inputRepeater.tick(moveActions);

    if(moveActions.length > 0) {
      // console.log('multiple moves: on frame', this.frame, moveActions);
      console.log(this.frame, moveActions.map(encodeMoveAction).join('; '))
    }

    // the main game loop, called once per game tick
    switch (this.fsm.currentState) {
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
    const mode: GameMode = this.fsm.currentState;
    const { movingCounters } = this.inputRepeater.getState();
    const { grid, pill, nextPill, seed, frame, gameTicks, modeTicks } = this;
    const { pillCount, score, timeBonus, lineColors } = this;
    return {
      mode,
      grid,
      pill,
      nextPill,
      movingCounters,
      seed,
      frame,
      gameTicks,
      modeTicks,
      pillCount,
      score,
      timeBonus,
      // comboLineCount
      lineColors
    };
  }
  public setState(state: GameState) {
    // set the state of the game to the given state
    // this requires a complete game state, and always completely rewrites game state

    // reset state machine mode
    delete this.fsm;
    this.fsm = this.initStateMachine(state.mode);
    // set input repeater state
    this.inputRepeater.setState({
      movingCounters: state.movingCounters
    });
    // assign all remaining state values to `this`
    this.grid = state.grid;
    this.pill = state.pill;
    this.nextPill = state.nextPill;
    this.seed = state.seed;
    this.frame = state.frame;
    this.gameTicks = state.gameTicks;
    this.modeTicks = state.modeTicks;
    this.pillCount = state.pillCount;
    this.score = state.score;
    this.timeBonus = state.timeBonus;
    // this.comboLineCount = state.comboLineCount;
    this.lineColors = state.lineColors;
  }

  protected initStateMachine(initialMode: GameMode = GameMode.Ready): TypeState.FiniteStateMachine<GameMode> {
    // create state machine to keep track of current game mode
    const fsm = new TypeState.FiniteStateMachine<GameMode>(initialMode);

    // game modes, used by the state machine
    // Ready: pre-playing state, todo: use this to populate viruses slowly?
    // Playing: pill is in play and falling
    // Reconcile: pill is locked in place, checking for lines to destroy
    // Cascade: cascading line destruction & debris falling
    // Destruction: lines are being destroyed
    // Ended: game has ended

    // Play
    fsm.from(GameMode.Ready).to(GameMode.Playing);
    // Reconcile
    fsm.from(GameMode.Playing, GameMode.Cascade).to(GameMode.Reconcile);
    // Destroy
    fsm.from(GameMode.Reconcile).to(GameMode.Destruction);
    // Cascade
    fsm.from(GameMode.Reconcile, GameMode.Destruction).to(GameMode.Cascade);
    // Ready
    fsm.from(GameMode.Cascade).to(GameMode.Playing);
    // Win
    fsm.from(GameMode.Reconcile).to(GameMode.Ended);
    // Lose
    fsm.from(GameMode.Playing).to(GameMode.Ended);
    // Reset
    fsm.fromAny(GameMode).to(GameMode.Ready);

    // onPlay
    fsm.on(GameMode.Playing, this.resetModeTicks);
    // onDestroy
    fsm.on(GameMode.Destruction, this.resetModeTicks);
    // onCascade
    fsm.on(GameMode.Cascade, this.resetModeTicks);

    return fsm;
  }
  protected resetModeTicks = (): void => {
    this.modeTicks = 0;
  };
  protected getGravity = (): number => {
    // lookup speed in gravityTable to get # of frames it takes to fall 1 row
    // increases over time due to acceleration
    // after every ACCELERATE_INTERVAL pills, gravity speed is increased by one
    const speed = this.options.baseSpeed + Math.floor(this.pillCount / ACCELERATE_INTERVAL);
    return gravityFrames(speed);
  };

  protected tickReady(): void {
    this.fsm.go(GameMode.Playing);
  }

  private tickPlaying(moveQueue: GameInputMove[]): void | GameTickResult {
    // this.comboLineCount = 0;
    this.lineColors = [];
    this.modeTicks++;
    this.gameTicks++;

    if (this.pill === undefined) {
      // try to add a new pill
      const pillColors = this.nextPill;
      const { grid, pill, didGive } = givePill(this.grid, pillColors);
      this.grid = grid;
      this.pill = pill;

      if (didGive) {
        // got a new pill!
        this.pillCount++;
        // generate the next pill
        this.nextPill = getNextPill(this.seed, this.pillCount);
      } else {
        // didn't get a pill, the entrance is blocked and we lose
        this.fsm.go(GameMode.Ended);
        return { type: GameTickResultType.Lose };
      }
    }

    // do the moves created by the inputRepeater
    let shouldReconcile = this.doMoves(moveQueue);

    // gravity pulling pill down
    const gravity = this.getGravity();
    if (this.modeTicks > gravity && !this.inputRepeater.movingCounters.has(GameInput.Down)) {
      // deactivate gravity while moving down
      this.modeTicks = 0;
      if (isPillLocation(this.pill)) {
        const moved = movePill(this.grid, this.pill, GridDirection.Down);
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
      // pill is no longer under user control
      this.pill = undefined;
      this.fsm.go(GameMode.Reconcile);
    }
  }

  private tickReconcile(): void | GameTickResult {
    // clear the true top row, in case any pills have been rotated up into it and stuck into place
    // do this first to ensure player can't get lines from it
    this.grid = clearTopRow(this.grid);

    // playfield is locked, check for same-color lines
    // setting them to destroyed if they are found
    const { grid, lineColors, hasLines, destroyedCount, virusCount } = destroyLines(this.grid);
    this.grid = grid;

    if (hasLines) {
      // this.comboLineCount += lines.length;
      this.lineColors = this.lineColors.concat(lineColors);
      const comboLineCount = lineColors.length;

      this.score +=
        Math.pow(destroyedCount, comboLineCount) * 5 + Math.pow(virusCount, comboLineCount) * 3 * 5;
    }

    const gridHasViruses = hasViruses(this.grid);

    // killed all viruses, you win
    if (!gridHasViruses) {
      // lower levels get a bit more expected time (higher time bonus)
      // because viruses are far apart, bonus is harder to get
      const origVirusCount = getLevelVirusCount(this.options.level);
      const expectedTicksPerVirus = 320 + Math.max(0, 40 - origVirusCount) * 3;
      const expectedTicks = origVirusCount * expectedTicksPerVirus;
      this.timeBonus = Math.max(0, expectedTicks - this.gameTicks);
      this.score += this.timeBonus;
      this.fsm.go(GameMode.Ended);
      return { type: GameTickResultType.Win };
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

  private tickCascade(): void | GameTickResult {
    // # of frames it takes debris to fall 1 row during cascade
    const cascadeGravity = gravityFrames(CASCADE_TICK_COUNT);

    if (this.modeTicks === 0) {
      // first cascade tick
      // check if there is any debris to drop
      const { fallingCells } = dropDebris(this.grid);
      // nothing to drop, ready for another pill
      if (!fallingCells.length) {
        this.fsm.go(GameMode.Playing);
        // if we have destroyed at least two lines in this combo,
        // return garbage colors to give to the other player (if playing multiplayer)
        if (this.lineColors.length >= 2) {
          return {
            type: GameTickResultType.Garbage,
            colors: this.lineColors.slice(0, 4)
          };
        }
        return;
      }
    } else if (this.modeTicks % cascadeGravity === 0) {
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
            ? GridDirection.Down
            : input === GameInput.Left
            ? GridDirection.Left
            : GridDirection.Right;

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
          input === GameInput.RotateCCW ? RotateDirection.CounterClockwise : RotateDirection.Clockwise;

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
