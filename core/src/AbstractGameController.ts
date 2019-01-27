import { defaults } from "lodash";

import Game from "./Game";

import { TypeState } from "typestate";
import { DEFAULT_GAME_CONTROLLER_OPTIONS } from "./constants";
import {
  GameControllerMode,
  GameControllerOptions,
  GameControllerState,
  GameInput,
  GameInputMove,
  InputEventType,
  InputManager,
  MoveInputEvent
} from "./types";

// game controller class
// controls the frame timing and must tick the Game object once per frame
// handles inputs and passes them into the Game
// controls the high-level game state and must call render() when game state changes

export const defaultOptions = DEFAULT_GAME_CONTROLLER_OPTIONS;

export default abstract class AbstractGameController {
  public options: GameControllerOptions;
  public step: number;
  public slowStep: number;
  public dt: number = 0;
  public last: number = 0;
  protected game: Game;
  protected moveInputQueue: MoveInputEvent[];
  protected fsm: TypeState.FiniteStateMachine<GameControllerMode>;

  constructor(passedOptions: Partial<GameControllerOptions> = {}) {
    const options: GameControllerOptions = defaults({}, passedOptions, defaultOptions);
    this.options = options;

    // a finite state machine representing game controller mode, & transitions between modes
    this.fsm = this.initStateMachine();

    // the game instance, which does the hard work
    this.game = this.initGame();

    // queued up move inputs which will processed on the next tick
    this.moveInputQueue = [];

    // time per tick step
    this.step = 1 / options.fps;
    // slow motion factor adjusted step time
    this.slowStep = options.slow * (1 / options.fps);

    // attach events from inputmanagers to the game
    this.attachInputEvents();
  }

  // methods which must be implemented by game controllers which derive from this class
  public abstract run(): void;
  public abstract tick(): void;

  public play() {
    this.fsm.go(GameControllerMode.Playing);
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

  protected initStateMachine(): TypeState.FiniteStateMachine<GameControllerMode> {
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
      this.game = this.initGame();
    });
    fsm.on(GameControllerMode.Playing, from => {
      if (from === GameControllerMode.Paused) {
        // Resume
        // tick to get the game started again after being paused
        this.tick();
      }
    });

    fsm.onTransition = (from: GameControllerMode, to: GameControllerMode) => {
      this.onChangeMode(from, to);
    };

    return fsm;
  }

  protected initGame(): Game {
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

  protected attachInputEvents(): void {
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
        const boundEnqueueInput: (eventType: InputEventType) => void = this.enqueueMoveInput.bind(
          this,
          input
        );

        inputManager.on(input, boundEnqueueInput);
      });
    });
  }

  protected enqueueMoveInput(input: GameInputMove, eventType: InputEventType) {
    // queue a user move, to be sent to the game on the next tick
    if (!this.fsm.is(GameControllerMode.Playing)) {
      return;
    }
    this.moveInputQueue.push({ input, eventType });
  }

  protected onChangeMode = (fromMode: GameControllerMode, toMode: GameControllerMode): void => {
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
