import { defaults } from "lodash";
import { TypeState } from "typestate";

import { defaultGameOptions, Game, GameOptions } from "../Game";

import {
  GameActionMove,
  GameActionType,
  GameControllerMode,
  GameInput,
  GameInputMove,
  GameTickResult,
  GameTickResultType,
  InputEventType,
  MoveInputEvent,
  GameControllerOptions,
  GameControllerState,
  InputManager
} from "../types";
import { DEFAULT_GAME_CONTROLLER_OPTIONS } from "./constants";

// game controller class
// controls the frame timing and must tick the Game object once per frame
// handles inputs and passes them into the Game
// controls the high-level game state and must call render() when game state changes

export const defaultOptions = DEFAULT_GAME_CONTROLLER_OPTIONS;

export abstract class AbstractGameController {
  public options: GameControllerOptions;
  public gameOptions: GameOptions;
  public getTime: () => number;
  protected game: Game;
  protected moveInputQueue: MoveInputEvent[];
  protected fsm: TypeState.FiniteStateMachine<GameControllerMode>;

  constructor(passedOptions: Partial<GameControllerOptions> = {}) {
    const options: GameControllerOptions = defaults({}, passedOptions, defaultOptions);
    this.options = options;

    const gameOptions: GameOptions = defaults({}, options.gameOptions, defaultGameOptions);
    // ensure the game seed is always the same
    if (!gameOptions.initialSeed) gameOptions.initialSeed = Date.now().toString();
    this.gameOptions = gameOptions;

    // a finite state machine representing game controller mode, & transitions between modes
    this.fsm = this.initStateMachine();

    // the game instance, which does the hard work
    this.game = this.initGame();

    // queued up move inputs which will processed on the next tick
    this.moveInputQueue = [];

    // attach events from inputmanagers to the game
    this.attachInputEvents();

    // function which gets the current time, for running game clock
    this.getTime = options.getTime;
  }
  public abstract tick(): void;

  public play() {
    this.fsm.go(GameControllerMode.Playing);
  }

  public tickGame(): void | GameTickResult {
    // tick the game, sending current queue of moves
    // const start = performance.now();
    // todo have inputmanagers return actions instead of MoveInputEvents
    const actions = this.moveInputQueue.map(
      (inputEvent: MoveInputEvent): GameActionMove => {
        return { type: GameActionType.Move, ...inputEvent };
      }
    );
    const tickResult: void | GameTickResult = this.game.tick(actions);

    if (tickResult && tickResult.type === GameTickResultType.Win) {
      this.fsm.go(GameControllerMode.Won);
    } else if (tickResult && tickResult.type === GameTickResultType.Lose) {
      this.fsm.go(GameControllerMode.Lost);
    }

    // const took = performance.now() - start;
    // if(took > 1) console.log('game tick took ', took);
    this.moveInputQueue = [];

    if (tickResult) console.log("RESULT", tickResult);
    return tickResult;
  }

  public getState(mode?: GameControllerMode): GameControllerState {
    // minimal description of game state to render
    return {
      mode: mode || this.fsm.currentState,
      gameState: this.game.getState()
    };
  }

  public cleanup() {
    // cleanup the game when we're done
    this.fsm.go(GameControllerMode.Ended);
    this.options.inputManagers.forEach(manager => manager.removeAllListeners());
  }

  // methods which must be implemented by game controllers which derive from this class
  protected abstract run(): void;

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
    return new Game({
      ...this.gameOptions
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
  };
}
