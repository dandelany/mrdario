import { invariant } from "ts-invariant";
import { cloneDeep, defaults, findIndex, findLast, findLastIndex, isEqual, isFunction, omitBy } from "lodash";
import { TypeState } from "typestate";

import { InputManager } from "../input/types";
import { GameControllerMode, GameControllerOptions, GameControllerState } from "./types";

import { defaultGameOptions, Game } from "../Game";
import {
  GameAction,
  GameActionGarbage,
  GameActionMove,
  GameActionType,
  GameInput,
  GameInputMove,
  GameOptions,
  GameState,
  GameTickResult,
  GameTickResultType,
  InputEventType,
  TimedGameActions,
  TimedGameTickResult,
  TimedMoveActions
} from "../types";
import { isMoveAction, isMoveInput } from "../utils";
import { DEFAULT_GAME_CONTROLLER_OPTIONS } from "./constants";
import { seedRandomInt } from "../../utils/random";

// import { encodeTimedActions } from "../../encoding/action";

// game controller class
// controls the frame timing and must tick the Game object once per frame
// handles inputs and passes them into the Game
// controls the high-level game state and must call render() when game state changes

export const defaultOptions = DEFAULT_GAME_CONTROLLER_OPTIONS;

export class GameController {
  public options: GameControllerOptions;
  public gameOptions: GameOptions;
  public getTime: () => number;
  protected game: Game;
  protected refTime: number;
  protected refFrame: number;
  protected fsm: TypeState.FiniteStateMachine<GameControllerMode>;

  protected futureActions: TimedGameActions[];
  protected actionHistory: TimedGameActions[];
  protected stateHistory: GameState[];

  constructor(passedOptions: Partial<GameControllerOptions> = {}) {
    const options: GameControllerOptions = defaults({}, passedOptions, defaultOptions);
    this.options = options;

    const gameOptions: GameOptions = defaults({}, options.gameOptions, defaultGameOptions);
    // ensure the game seed is always the same
    if (!gameOptions.initialSeed) {
      gameOptions.initialSeed = Date.now().toString();
    }
    this.gameOptions = gameOptions;

    // a finite state machine representing game controller mode, & transitions between modes
    this.fsm = this.initStateMachine();

    // the game instance, which does the hard work
    this.game = this.initGame();

    // attach events from inputmanagers to the game
    this.attachInputEvents();

    // function which gets the current time, for running game clock
    this.getTime = options.getTime;

    this.actionHistory = [];
    this.futureActions = [];

    this.stateHistory = [this.game.getState()];

    this.refFrame = 0;
    this.refTime = this.getTime();
  }

  public play() {
    this.fsm.go(GameControllerMode.Playing);
  }
  public setStartTime(startTime: number) {
    this.refTime = startTime;
  }
  public startCountdown(delay?: number) {
    if (delay !== undefined && Number.isFinite(delay)) {
      this.refTime = this.getTime() + delay;
    }
    this.fsm.go(GameControllerMode.Countdown);
  }

  public tick(): TimedGameTickResult[] {
    // called once per frame
    if (!this.fsm.is(GameControllerMode.Playing)) {
      return [];
    }
    const now = this.getTime();
    const { refFrame, refTime } = this;

    // calculate the expected game frame we should be at now,
    // and tick the game until it matches the expected frame
    // this allows the number of ticks to stay consistent over time
    // even if FPS changes or lags due to performance
    const frame = this.game.frame;
    const expectedFrame = Math.floor((now - refTime) / (1000 / 60)) + refFrame;

    const frameDiff = expectedFrame - frame;
    if (frameDiff > 6000) {
      console.error("GameController ticks got out of sync");
    }

    // if (Math.abs(frameDiff) > 1) {
    //   console.log("frame off by", expectedFrame - frame);
    // }

    const tickResults: TimedGameTickResult[] = this.tickToFrame(expectedFrame);

    // render with the current game state
    // this.options.render(this.getState(), this.dt / slow);
    this.options.render(this.getState());
    // this.last = now;
    requestAnimationFrame(this.tick.bind(this));

    return tickResults;
  }

  public tickToFrame(toFrame: number): TimedGameTickResult[] {
    const frameDiff = toFrame - this.game.frame;
    const tickResults: TimedGameTickResult[] = [];
    invariant(
      frameDiff >= 0,
      `tickToFrame cannot tick to an earlier frame (game frame ${this.game.frame}, toFrame ${toFrame})`
    );

    for (let i = 0; i < frameDiff; i++) {
      const result = this.tickGame();
      if (result) {
        tickResults.push([this.game.frame, result]);
        if (result.type === GameTickResultType.Win) {
          this.fsm.go(GameControllerMode.Won);
          break;
        } else if (result.type === GameTickResultType.Lose) {
          this.fsm.go(GameControllerMode.Lost);
          break;
        }
      }
    }
    return tickResults;
  }

  public tickGame(): void | GameTickResult {
    // tick the game to the next frame, applying any relevant actions from futureActions queue
    // check if there are actions in futureActions that are supposed to happen on next frame
    // this is a tight loop - don't create arrays if not necessary
    let actions: GameAction[] | undefined;
    let timedActions: TimedGameActions | undefined;
    if (this.futureActions.length && this.futureActions[0][0] === this.game.frame + 1) {
      const nextTimedActions = this.futureActions.shift();
      if (nextTimedActions) {
        // add action from futureActions to list of actions for next tick
        actions = nextTimedActions[1];
        timedActions = nextTimedActions;
      }
    }

    const { frame } = this.game;
    if (seedRandomInt("foo" + frame, 0, 1000) === 50) {
      const garbageAction: GameActionGarbage = {
        type: GameActionType.Garbage,
        colors: [seedRandomInt(frame + "a", 0, 2), seedRandomInt(frame + "b", 0, 2)]
      };
      const newActions = (actions || []).slice(0).concat([garbageAction]);
      actions = newActions;
    }

    const tickResult = this.game.tick(actions);

    // call user-provided callback so they can eg. send moves to server
    if (timedActions && timedActions.length && this.options.onMoveActions) {
      const moveActions: GameActionMove[] = timedActions[1].filter(isMoveAction);
      if (moveActions.length) {
        this.options.onMoveActions([timedActions[0], moveActions]);
      }
    }

    if (actions && actions.length && this.options.hasHistory) {
      const frameActions: TimedGameActions = [this.game.frame, actions];
      // console.log("history item", frameActions);
      this.actionHistory.push(frameActions);
      // todo still need to cloneDeep?
      this.stateHistory.push(cloneDeep(this.game.getState()));
      // todo limit length of stored stateHistory
      // console.log(this.actionHistory.map(item => encodeTimedActions(item)).join(";"));
      // console.log(this.actionHistory, this.stateHistory);
    }

    return tickResult;
  }

  public getState(mode?: GameControllerMode): GameControllerState {
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

  public run() {
    // called when gameplay starts, to initialize the game loop
    // this.last = timestamp();
    this.refFrame = 0;
    this.refTime = this.getTime();
    // todo update refFrame/refTime when the game is paused

    // todo allow passed rAF / setinterval
    requestAnimationFrame(this.tick.bind(this));
  }

  public addFrameActions(frameActions: TimedGameActions) {
    const [frame] = frameActions;
    if (frame > this.game.frame) {
      // action(s) are in the future, add them to the future actions queue
      // console.log("adding future action for frame:", frame);
      addFrameActionsToList(frameActions, this.futureActions);
    } else {
      // action(s) are in past (or present) tick
      // update the game state by rewriting game history to include the past actions
      console.log("action happened in past frame:", frame);
      invariant(this.options.hasHistory, `Action happened in the past and hasHistory is false`);
      this.rewriteHistoryWithActions(frameActions);
    }
    // this.actionHistory.map(encodeTimedActions);
  }

  protected initStateMachine(
    initialMode: GameControllerMode = GameControllerMode.Ready
  ): TypeState.FiniteStateMachine<GameControllerMode> {
    // a finite state machine representing game mode, & transitions between modes
    const fsm = new TypeState.FiniteStateMachine<GameControllerMode>(initialMode);

    fsm.from(GameControllerMode.Ready).to(GameControllerMode.Countdown);
    fsm.from(GameControllerMode.Countdown).to(GameControllerMode.Playing);

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

    // Countdown
    fsm.on(GameControllerMode.Countdown, this.onCountdown);
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

  protected onCountdown = (): void => {
    console.log("countdown!");
    const startTime = this.refTime;
    const now = this.getTime();
    if (now >= startTime) {
      this.fsm.go(GameControllerMode.Playing);
    } else {
      setTimeout(() => {
        this.fsm.go(GameControllerMode.Playing);
      }, startTime - now);
    }
  };

  protected initGame(): Game {
    return new Game({
      ...this.gameOptions
    });
  }

  protected attachInputEvents(): void {
    this.options.inputManagers.forEach((inputManager: InputManager) => {
      inputManager.on("input", this.handleInput);
    });
  }

  protected handleMoveInput = (input: GameInputMove, eventType: InputEventType) => {
    // queue a user move, to be sent to the game on the next tick

    if (!this.fsm.is(GameControllerMode.Playing)) {
      return;
    }

    const timedActions: TimedMoveActions = [
      this.game.frame + 1,
      [{ type: GameActionType.Move, input, eventType }]
    ];

    // // call user-provided callback so they can eg. send moves to server
    // if (this.options.onMoveActions) {
    //   this.options.onMoveActions(timedActions);
    // }

    // add move actions so they will be processed on next game tick
    // console.log('handled moves', timedActions);
    this.addFrameActions(timedActions);
  };

  protected handleInput = (input: GameInput, eventType: InputEventType) => {
    if (input === GameInput.Play) {
      // todo?
      this.fsm.go(GameControllerMode.Playing);
    } else if (input === GameInput.Pause) {
      // todo
      if (eventType === InputEventType.KeyDown) {
        this.fsm.go(GameControllerMode.Paused);
      }
    } else if (input === GameInput.Resume) {
      // todo??
      if (eventType === InputEventType.KeyDown) {
        this.fsm.go(GameControllerMode.Playing);
      }
    } else if (input === GameInput.Reset) {
      // todo remove?
      this.fsm.go(GameControllerMode.Ready);
    }

    if (isMoveInput(input)) {
      this.handleMoveInput(input, eventType);
    }
  };

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

  protected makeDummyGame(state?: GameState) {
    // make a dummy game which we can use to replay the game history without triggering any callbacks
    // use the same options as this.game but omit callbacks
    const dummyOptions: Partial<GameOptions> = omitBy(this.game.options, isFunction);
    const dummyGame = new Game(dummyOptions);
    if (state) {
      dummyGame.setState(state);
    }
    return dummyGame;
  }
  protected rewindGameToFrame(game: Game, frame: number) {
    invariant(this.options.hasHistory, `Cannot rewind game, options.hasHistory is false`);
    // console.log('history length', this.stateHistory.length, this.actionHistory.length);
    // use state history to "rewind" the state of the game to a given frame
    // may not have saved that exact frame, so find the nearest saved frame less tham or equal to the target,
    // start there, and tick forward through time until reaching the target frame
    const restoreState = findLast(this.stateHistory, gameState => gameState.frame <= frame);
    if (restoreState !== undefined) {
      game.setState(restoreState);
      while (game.frame < frame) {
        game.tick();
      }
    } else {
      throw new Error(`Could not rewind to frame ${frame} - current frame is ${this.game.frame}`);
    }
  }

  protected rewriteHistoryWithActions(frameActions: TimedGameActions) {
    // const stateHistory = this.stateHistory;
    invariant(this.options.hasHistory, `Cannot rewrite history, options.hasHistory is false`);
    const [frame] = frameActions;
    const currentFrame = this.game.frame;
    // make a dummy game with the last saved state before timedActions
    const dummyGame = this.makeDummyGame();
    this.rewindGameToFrame(dummyGame, frame - 1);

    // insert new frameActions at the correct place in this.actionHistory
    addFrameActionsToList(frameActions, this.actionHistory);
    // all of our state history after (frame - 1) is no longer valid - remove them from stateHistory
    const firstInvalidStateIndex = findLastIndex(this.stateHistory, state => state.frame >= frame);
    if (firstInvalidStateIndex > -1) {
      console.log("splicing state history", firstInvalidStateIndex);
      this.stateHistory.splice(firstInvalidStateIndex, this.stateHistory.length - firstInvalidStateIndex);
    }

    // find the earliest action(s) in actionHistory which happen after the game's current frame
    let nextActionsIndex = this.actionHistory.findIndex(([actionsFrame]) => actionsFrame > dummyGame.frame);
    // tick through the game, applying actions in actionHistory to appropriate frames
    while (nextActionsIndex > -1) {
      const [nextActionsFrame, nextActions] = this.actionHistory[nextActionsIndex];
      if (nextActionsFrame > currentFrame) {
        break;
      }
      tickGameToFrame(dummyGame, nextActionsFrame - 1);
      dummyGame.tick(nextActions);
      // add post-tick game state to stateHistory
      // todo refactor to not need cloneDeep?
      this.stateHistory.push(cloneDeep(dummyGame.getState()));

      // get the next action in history, or break out of loop if we've done them all
      nextActionsIndex = nextActionsIndex >= this.actionHistory.length - 1 ? -1 : nextActionsIndex + 1;
    }
    // dummyGame is now at the frame of the last action in actionHistory before currentFrame
    // no more actions - tick ahead to the current frame
    tickGameToFrame(dummyGame, currentFrame);
    // done - dummyGame is at same frame as this.game, but has frameActions in its history
    // update this.game state to dummyGame's state
    this.game.setState(dummyGame.getState());
  }

  public replayHistory(): void {
    // todo use it or lose it?
    const dummyGame = this.makeDummyGame(cloneDeep(this.stateHistory[0]));

    const currentFrame = this.game.frame;

    // find the first action in actionHistory which happens after the game's current frame
    let nextActionsItemIndex = findIndex(this.actionHistory, ([frame]) => frame > dummyGame.frame);
    // tick through the game, applying actions in actionHistory to appropriate frames
    while (nextActionsItemIndex > -1) {
      const [nextActionsFrame, nextActions] = this.actionHistory[nextActionsItemIndex];
      if (nextActionsFrame > currentFrame) break;
      tickGameToFrame(dummyGame, nextActionsFrame - 1);
      dummyGame.tick(nextActions);
      // get the next action in history, or break out of loop if we've done them all
      nextActionsItemIndex =
        nextActionsItemIndex >= this.actionHistory.length - 1 ? -1 : nextActionsItemIndex + 1;
    }
    // game is now at the frame of the last action in actionHistory before currentFrame
    // no more actions - tick ahead to target frame
    tickGameToFrame(dummyGame, currentFrame);

    // todo handle this error?
    if (!isEqual(this.game.getState(), dummyGame.getState()))
      console.error("states not equal: ", this.game.getState(), dummyGame.getState());
  }
}

function tickGameToFrame(game: Game, frame: number): void {
  // todo handle result!!
  if (frame < game.frame) {
    throw new Error(`Game is at frame ${game.frame} - cannot tick to ${frame}`);
  }
  if (frame === game.frame) {
    return;
  }
  while (frame > game.frame) {
    game.tick();
  }
}

function addFrameActionsToList(frameActions: TimedGameActions, actionsList: TimedGameActions[]): void {
  // mutate actionsList to add frameActions at correct place in the list, merging with existing actions if necessary
  const [addedFrame, addedActions] = frameActions;
  // find first item in list with frame >= the one we're adding
  const spliceIndex = actionsList.findIndex(([frame]) => frame >= addedFrame);
  if (spliceIndex < 0) {
    // didn't find any actions at same time or after ours - add to end of list
    actionsList.push(frameActions);
  } else {
    const [nextFrame, nextActions] = actionsList[spliceIndex];
    if (nextFrame === addedFrame) {
      // already have action(s) on the same frame, merge the lists
      const mergedActions = [...nextActions, ...addedActions];
      actionsList[spliceIndex] = [addedFrame, mergedActions];
    } else {
      // next item in the list is after addedFrame, insert item in the list before it
      actionsList.splice(spliceIndex, 0, frameActions);
    }
  }
}
