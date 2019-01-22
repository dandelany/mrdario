import { defaults, noop } from "lodash";

import Game from "../Game";

import { TypeState } from "typestate";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../constants";
import {
  GameControllerMode,
  GameControllerOptions,
  GameControllerState,
  GameInput,
  GameInputMove,
  InputEventType,
  InputManager
} from "../types";

// a game controller class for the basic 1-player game, played entirely on the client (in browser)
// controls the frame timing and must tick the Game object once per frame
// handles inputs and passes them into the Game
// controls the high-level game state and must call render() when game state changes

// options that can be passed to control game parameters
export const defaultOptions: GameControllerOptions = {
  // list of input managers, eg. of keyboard, touch events
  // these are event emitters that fire on every user game input (move)
  // moves are queued and fed into the game to control it
  inputManagers: [],
  // render function which is called when game state changes
  // this should be the main connection between game logic and presentation
  render: noop,
  // callback called when state machine mode changes
  onChangeMode: noop,
  // current virus level (generally 1-20)
  level: 0,
  // pill fall speed
  speed: 15,
  // width and height of the playfield grid, in grid units
  height: PLAYFIELD_HEIGHT,
  width: PLAYFIELD_WIDTH,
  // frames (this.tick/render calls) per second
  fps: 60,
  // slow motion factor, to simulate faster/slower gameplay for debugging
  slow: 1
};

export default class SingleGameController {
  public game: Game;
  public options: GameControllerOptions;
  public moveInputQueue: any; // todo
  public step: number;
  public slowStep: number;
  public dt: number = 0;
  public last: number = 0;
  private fsm: TypeState.FiniteStateMachine<GameControllerMode>;

  constructor(passedOptions: Partial<GameControllerOptions> = {}) {
    const options: GameControllerOptions = defaults({}, passedOptions, defaultOptions);
    this.options = options;

    this.game = this.initGame();

    // a finite state machine representing game mode, & transitions between modes
    this.fsm = this.initStateMachine();

    // queued up move inputs which will processed on the next tick
    this.moveInputQueue = [];

    // time per tick step
    this.step = 1 / options.fps;
    // slow motion factor adjusted step time
    this.slowStep = options.slow * (1 / options.fps);

    this.attachInputEvents();
  }

  public initGame(): Game {
    const { width, height, level, speed } = this.options;
    return new Game({
      width,
      height,
      level,
      baseSpeed: speed,
      onWin: () => {
        this.fsm.go(GameControllerMode.Won);
      },
      onLose: () => {
        this.fsm.go(GameControllerMode.Lost);
      }
    });
  }

  public attachInputEvents(): void {
    this.options.inputManagers.forEach((inputManager: InputManager) => {
      inputManager.on(GameInput.Play, () => {
        this.fsm.go(GameControllerMode.Playing);
      });
      inputManager.on(GameInput.Pause, (eventType: InputEventType) => {
        if (eventType === InputEventType.KeyDown) {
          this.fsm.go(GameControllerMode.Paused);
        }
      });
      inputManager.on(GameInput.Resume, (eventType: InputEventType) => {
        if (eventType === InputEventType.KeyDown) {
          this.fsm.go(GameControllerMode.Playing);
        }
      });
      inputManager.on(GameInput.Reset, () => {
        this.fsm.go(GameControllerMode.Ready);
      });

      const moveInputs: GameInputMove[] = [
        GameInput.Left,
        GameInput.Right,
        GameInput.Down,
        GameInput.Up,
        GameInput.RotateCCW,
        GameInput.RotateCW
      ];
      moveInputs.forEach((input: GameInputMove) => {
        const boundEnqueueInput: (
          eventType: InputEventType,
          event: Event
        ) => void = this.enqueueMoveInput.bind(this, input);

        inputManager.on(input, boundEnqueueInput);
      });
    });
  }
  public enqueueMoveInput(input: GameInputMove, eventType: InputEventType, _event: Event) {
    // queue a user move, to be sent to the game on the next tick
    if (!this.fsm.is(GameControllerMode.Playing)) {
      return;
    }
    this.moveInputQueue.push({ input, eventType });
  }

  public play() {
    this.fsm.go(GameControllerMode.Playing);
  }

  public run() {
    // called when gameplay starts, to initialize the game loop
    this.dt = 0;
    this.last = timestamp();
    requestAnimationFrame(this.tick.bind(this));
  }

  public tick() {
    // called once per frame
    if (!this.fsm.is(GameControllerMode.Playing)) {
      return;
    }
    const now = timestamp();
    const { slow } = this.options;
    const { dt, last, slowStep } = this;

    // allows the number of ticks to stay consistent
    // even if FPS changes or lags due to performance
    this.dt = dt + Math.min(1, (now - last) / 1000);
    while (this.dt > slowStep) {
      this.dt = this.dt - slowStep;
      this.tickGame();
    }

    // render with the current game state
    this.options.render(this.getState(), this.dt / slow);
    this.last = now;
    requestAnimationFrame(this.tick.bind(this));
  }
  public tickGame() {
    // tick the game, sending current queue of moves
    // const start = performance.now();
    this.game.tick(this.moveInputQueue);
    // const took = performance.now() - start;
    // if(took > 1) console.log('game tick took ', took);
    this.moveInputQueue = [];
  }

  public getState(mode?: GameControllerMode): GameControllerState {
    // minimal description of game state to render
    return {
      mode: mode || this.fsm.currentState,
      pillCount: this.game.counters.pillCount,
      grid: this.game.grid,
      pillSequence: this.game.pillSequence,
      score: this.game.score,
      timeBonus: this.game.timeBonus
    };
  }

  public cleanup() {
    // cleanup the game when we're done
    this.fsm.go(GameControllerMode.Ended);
    this.options.inputManagers.forEach(manager => manager.removeAllListeners());
  }

  private initStateMachine(): TypeState.FiniteStateMachine<GameControllerMode> {
    // a finite state machine representing game mode, & transitions between modes
    const fsm = new TypeState.FiniteStateMachine<GameControllerMode>(GameControllerMode.Ready);

    // Play
    fsm.from(GameControllerMode.Ready).to(GameControllerMode.Playing);
    // Pause
    fsm.from(GameControllerMode.Playing).to(GameControllerMode.Paused);
    // Resume
    fsm.from(GameControllerMode.Paused).to(GameControllerMode.Playing);
    // Win
    fsm.from(GameControllerMode.Playing).to(GameControllerMode.Won);
    // Lose
    fsm.from(GameControllerMode.Playing).to(GameControllerMode.Lost);
    // Reset
    fsm.fromAny(GameControllerMode).to(GameControllerMode.Ready);
    // End
    fsm.fromAny(GameControllerMode).to(GameControllerMode.Ended);

    // Play
    fsm.on(GameControllerMode.Playing, () => {
      this.run();
    });
    // Reset
    fsm.on(GameControllerMode.Ready, () => {
      console.log("on reset");
      this.game = this.initGame();
    });
    fsm.on(GameControllerMode.Playing, from => {
      if (from === GameControllerMode.Paused) {
        // Resume
        // tick to get the game started again after being paused
        this.tick();
      }
    });

    // todo attach handler for all mode changes
    fsm.onTransition = (from: GameControllerMode, to: GameControllerMode) => {
      this._onChangeMode(from, to);
    };

    return fsm;
  }

  private _onChangeMode = (fromMode: GameControllerMode, toMode: GameControllerMode): void => {
    // update mode of all input managers
    this.options.inputManagers.forEach((inputManager: InputManager) => {
      inputManager.setMode(toMode);
    });
    // re-render on any mode change
    this.options.render(this.getState(toMode));
    // call handler
    this.options.onChangeMode(fromMode, toMode);
  }
}

function timestamp(): number {
  return window.performance && window.performance.now
    ? window.performance.now()
    : new Date().getTime();
}
