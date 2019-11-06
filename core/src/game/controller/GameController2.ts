import { cloneDeep, defaults, findLast, findLastIndex, get, isFunction, noop, omitBy, times, every } from "lodash";
import { invariant } from "ts-invariant";
import { TypeState } from "typestate";

import { InputManager } from "../input/types";

import { getGetTime } from "../../utils/time";
import { Game } from "../Game";
import {
  GameControllerAction,
  GameControllerActionType,
  GameControllerMovesAction,
  GameControllerReadyAction,
  GameControllerStartAction,
  GameInput,
  GameInputMove,
  GameOptions,
  GameState,
  GameTickResult,
  InputEventType,
  TimedGameActions,
  TimedGameTickResult,
  TimedMoveActions
} from "../types";
import { isMoveAction, isMoveInput } from "../utils";
import { GameAction, GameActionMove, GameActionType } from "../types/gameAction";

export interface GameControllerOptions {
  players: number;
  seed?: string;
  gameOptions: Array<Partial<GameOptions>>;
  hasHistory: boolean;
  getTime: () => number;
  // each game may provide its own inputmanagers
  inputManagers: InputManager[][];
  render: (state: GameControllerState, dt?: number) => any;
  onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => any;
  onMoveActions?: (gameIndex: number, timedMoveActions: TimedMoveActions) => void;
}

export const DEFAULT_GAME_CONTROLLER_OPTIONS: GameControllerOptions = {
  players: 1,
  gameOptions: [
    {
      level: 0,
      baseSpeed: 15
    }
  ],
  hasHistory: true,
  getTime: getGetTime(),
  // list of input managers, eg. of keyboard, touch events
  // these are event emitters that fire on every user game input (move)
  // moves are queued and fed into the game to control it
  inputManagers: [],
  // render function which is called when game state changes
  // this should be the main connection between game logic and presentation
  render: noop,
  // callback called when state machine mode changes
  onChangeMode: noop
};

export enum GameControllerMode {
  Setup = "Setup",
  Ready = "Ready",
  // Countdown = "Countdown",
  Playing = "Playing",
  Paused = "Paused",
  Ended = "Ended"
}

export interface GameControllerState {
  mode: GameControllerMode;
  gameStates: GameState[];
}


// import { encodeTimedActions } from "../../encoding/action";

// game controller class
// controls the frame timing and must tick the Game object once per frame
// handles inputs and passes them into the Game
// controls the high-level game state and must call render() when game state changes

export const defaultOptions = DEFAULT_GAME_CONTROLLER_OPTIONS;

export class GameController {
  public options: GameControllerOptions;
  public gameOptions: Array<Partial<GameOptions>>;
  public getTime: () => number;
  protected playersReady: boolean[];
  protected games: Game[];
  protected frame: number;
  protected refTime: number;
  protected refFrame: number;
  protected fsm: TypeState.FiniteStateMachine<GameControllerMode>;

  // these are [][]s because they have one array per game
  protected futureActions: TimedGameActions[][];
  protected actionHistory: TimedGameActions[][];
  protected stateHistory: GameState[][];
  protected initialGameStates: GameState[];

  constructor(passedOptions: Partial<GameControllerOptions> = {}) {
    const options: GameControllerOptions = defaults({}, passedOptions, defaultOptions);
    this.options = options;

    const seed = options.seed || Date.now().toString();

    this.gameOptions = [];
    this.games = [];
    times(options.players, (i: number) => {
      const gameIOptions: Partial<GameOptions> = get(options.gameOptions, i, {});
      // RNG seed is the same for all games
      gameIOptions.initialSeed = seed;
      this.gameOptions[i] = gameIOptions;
      // the game instance, which does the hard work
      this.games[i] = this.initGame(gameIOptions);
      invariant(this.games[i].frame === 0, "Game must have frame = 0 after initialization");
    });
    this.frame = 0;

    // boolean indicating whether each player is ready to start the game (ie. has sent Ready action)
    this.playersReady = times(options.players, () => false);

    // a finite state machine representing game controller mode, & transitions between modes
    this.fsm = this.initStateMachine();

    // attach events from inputmanagers to the game
    this.attachInputEvents();

    // function which gets the current time, for running game clock
    this.getTime = options.getTime;

    const emptyArrayForEachGame = () => this.games.map(() => []);
    this.actionHistory = emptyArrayForEachGame() as TimedGameActions[][];
    this.futureActions = emptyArrayForEachGame() as TimedGameActions[][];
    this.stateHistory = emptyArrayForEachGame() as GameState[][];
    this.initialGameStates = this.games.map(game => game.getState());

    this.refFrame = 0;
    this.refTime = this.getTime();
  }

  public handleAction(action: GameControllerAction) {
    console.log(`${action.type} action:`, action);

    switch (action.type) {
      case GameControllerActionType.Settings:
        // todo handle settings change
        console.log(action.type, action.player, action.settings);
        break;
      case GameControllerActionType.Ready:
        // todo handle ready
        this.handleReady(action);
        break;
      case GameControllerActionType.Start:
        // todo handle Start
        this.handleStart(action);
        break;
      case GameControllerActionType.Moves:
        this.handleMoves(action);
        break;
    }
  }

  protected handleReady(action: GameControllerReadyAction) {
    const {currentState} = this.fsm;
    invariant(
      currentState === GameControllerMode.Setup,
      `Can only send Ready action in Setup mode (currently ${currentState})`
    );
    // set player ready state
    this.playersReady[action.player] = action.ready;
    // fire Start action if all players are ready
    if(every(this.playersReady, ready => ready === true)) {
      setTimeout(() => {
        this.handleAction({type: GameControllerActionType.Start});
      }, 1);
    }
  }

  protected handleStart(action: GameControllerStartAction) {
    console.log(action.type);
  }

  protected handleMoves(action: GameControllerMovesAction) {
    console.log(action.type, action.player, action.moves);
    this.handleTimedGameActions(action.player, action.moves);
  }

  public play() {
    this.fsm.go(GameControllerMode.Playing);
  }
  // public setStartTime(startTime: number) {
  //   this.refTime = startTime;
  // }
  // public startCountdown(delay?: number) {
  //   if (delay !== undefined && Number.isFinite(delay)) {
  //     this.refTime = this.getTime() + delay;
  //   }
  //   this.fsm.go(GameControllerMode.Countdown);
  // }

  public tick(): TimedGameTickResult[][] {
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
    // const frame = this.games[0].frame;
    const expectedFrame = Math.floor((now - refTime) / (1000 / 60)) + refFrame;

    // todo allow delay between games instead of always being synchronized

    //
    // const frameDiff = expectedFrame - frame;
    // if (frameDiff > 6000) {
    //   console.error("GameController ticks got out of sync");
    // }
    // if (Math.abs(frameDiff) > 1) {
    //   console.log("frame off by", expectedFrame - frame);
    // }

    const tickResults: TimedGameTickResult[][] = this.tickToFrame(expectedFrame);

    // render with the current game state
    // this.options.render(this.getState(), this.dt / slow);
    this.options.render(this.getState());
    // this.last = now;
    requestAnimationFrame(this.tick.bind(this));

    return tickResults;
  }

  public tickToFrame(toFrame: number): TimedGameTickResult[][] {
    const gamesTickResults: TimedGameTickResult[][] = this.games.map(() => []);

    const frameDiff = toFrame - this.frame;
    invariant(
      frameDiff >= 0,
      `tickToFrame can't tick to an earlier frame (this.frame ${this.frame}, toFrame ${toFrame})`
    );

    for (let i = 0; i < frameDiff; i++) {
      const frameResults = this.tickGames();

      for (let j = 0; j < frameResults.length; j++) {
        const result = frameResults[j];
        if (result) {
          gamesTickResults[j].push([this.frame, result]);
          // todo handle result, emit Ended action?
          // give garbage, etc
        }
      }
    }

    return gamesTickResults;
  }

  public tickGames(): Array<GameTickResult | null> {
    const results = [];
    for (let i = 0; i < this.games.length; i++) {
      const result = this.tickGame(i) || null;
      results.push(result);
    }
    this.frame++;
    // todo handle result, call callback
    return results;
  }

  public getState(mode?: GameControllerMode): GameControllerState {
    return {
      mode: mode || this.fsm.currentState,
      gameStates: this.games.map(g => g.getState())
    };
  }

  public cleanup() {
    // cleanup the game when we're done
    this.fsm.go(GameControllerMode.Ended);
    // unbind inputmanager listeners
    for (const gameInputManagers of this.options.inputManagers) {
      for (const manager of gameInputManagers) {
        manager.removeAllListeners();
      }
    }
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



  public handleTimedGameActions(gameIndex: number, timedActions: TimedGameActions) {
    const game = this.games[gameIndex];
    invariant(!!game, `Invalid game index ${gameIndex}`);
    const [frame] = timedActions;

    if (frame > game.frame) {
      // action(s) are in the future, add them to the future actions queue
      // console.log("adding future action for frame:", frame);
      const gameFutureActions = this.futureActions[gameIndex];
      addTimedActionsTo(timedActions, gameFutureActions);
    } else {
      // action(s) are in past (or present) tick
      // update the game state by rewriting game history to include the past actions
      console.log("action happened in past frame:", frame);
      invariant(this.options.hasHistory, `Action happened in the past and hasHistory is false`);
      this.rewriteHistoryWithActions(gameIndex, timedActions);
    }
    // this.actionHistory.map(encodeTimedActions);
  }

  protected tickGame(gameIndex: number): void | GameTickResult {
    invariant(gameIndex < this.games.length, "tickGame got invalid game index");
    const game = this.games[gameIndex];
    const gameFutureActions = this.futureActions[gameIndex];

    // tick the game to the next frame, applying any relevant actions from futureActions queue
    // check if there are actions in futureActions that are supposed to happen on next frame
    // this is a tight loop - don't create arrays if not necessary
    let actions: GameAction[] | undefined;
    let timedActions: TimedGameActions | undefined;
    if (gameFutureActions.length && gameFutureActions[0][0] === game.frame + 1) {
      const nextTimedActions = gameFutureActions.shift();
      if (nextTimedActions) {
        // add action from futureActions to list of actions for next tick
        actions = nextTimedActions[1];
        timedActions = nextTimedActions;
      }
    }

    const tickResult = game.tick(actions);

    // call user-provided callback so they can eg. send moves to server
    if (timedActions && timedActions.length && this.options.onMoveActions) {
      const moveActions: GameActionMove[] = timedActions[1].filter(isMoveAction);
      if (moveActions.length) {
        this.options.onMoveActions(gameIndex, [timedActions[0], moveActions]);
      }
      // todo general action callback
    }

    // todo two different options for statehistory/actionhistory?
    if (actions && actions.length && this.options.hasHistory) {
      const gameActionHistory = this.actionHistory[gameIndex];
      const gameStateHistory = this.stateHistory[gameIndex];
      const frameActions: TimedGameActions = [game.frame, actions];
      // console.log("history item", frameActions);
      gameActionHistory.push(frameActions);
      // todo still need to cloneDeep?
      gameStateHistory.push(cloneDeep(game.getState()));
      // todo limit length of stored stateHistory
      // console.log(this.actionHistory.map(item => encodeTimedActions(item)).join(";"));
      // console.log(this.actionHistory, this.stateHistory);
    }

    return tickResult;
  }

  protected initStateMachine(
    initialMode: GameControllerMode = GameControllerMode.Setup
  ): TypeState.FiniteStateMachine<GameControllerMode> {
    // a finite state machine representing game mode, & transitions between modes
    const fsm = new TypeState.FiniteStateMachine<GameControllerMode>(initialMode);

    fsm.from(GameControllerMode.Setup).to(GameControllerMode.Ready);
    fsm.from(GameControllerMode.Ready).to(GameControllerMode.Playing);

    // Play
    fsm.from(GameControllerMode.Ready).to(GameControllerMode.Playing);
    // Pause
    fsm.from(GameControllerMode.Playing).to(GameControllerMode.Paused);
    // Resume
    fsm.from(GameControllerMode.Paused).to(GameControllerMode.Playing);
    // Win
    fsm.from(GameControllerMode.Playing).to(GameControllerMode.Ended);
    // Reset
    fsm.fromAny(GameControllerMode).to(GameControllerMode.Ready);
    // End
    fsm.fromAny(GameControllerMode).to(GameControllerMode.Ended);

    // Countdown
    // fsm.on(GameControllerMode.Countdown, this.onCountdown);
    // Play
    fsm.on(GameControllerMode.Playing, () => {
      this.run();
    });
    // todo Reset?
    // fsm.on(GameControllerMode.Ready, () => {
    //   this.game = this.initGame();
    // });
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

  // protected onCountdown = (): void => {
  //   console.log("countdown!");
  //   const startTime = this.refTime;
  //   const now = this.getTime();
  //   if (now >= startTime) {
  //     this.fsm.go(GameControllerMode.Playing);
  //   } else {
  //     setTimeout(() => {
  //       this.fsm.go(GameControllerMode.Playing);
  //     }, startTime - now);
  //   }
  // };

  protected initGame(gameOptions: Partial<GameOptions>): Game {
    return new Game({ ...gameOptions });
  }

  protected attachInputEvents(): void {
    const {inputManagers} = this.options;
    for (let i = 0; i < inputManagers.length; i++) {
      const gameInputManagers = inputManagers[i];
      for (const manager of gameInputManagers) {
        manager.on("input", this.handleInput.bind(this, i));
      }
    }
  }

  protected handleInput = (gameIndex: number, input: GameInput, eventType: InputEventType) => {
    // todo handle other game inputs - Play(?) Pause Resume Reset
    if (isMoveInput(input)) {
      this.handleMoveInput(gameIndex, input, eventType);
    }
  };

  protected handleMoveInput = (gameIndex: number, input: GameInputMove, eventType: InputEventType) => {
    // queue a user move, to be sent to the game on the next tick

    if (!this.fsm.is(GameControllerMode.Playing)) {
      return;
    }

    const timedActions: TimedMoveActions = [
      this.games[gameIndex].frame + 1,
      [{ type: GameActionType.Move, input, eventType }]
    ];

    // // call user-provided callback so they can eg. send moves to server
    // if (this.options.onMoveActions) {
    //   this.options.onMoveActions(timedActions);
    // }

    // add move actions so they will be processed on next game tick
    // console.log('handled moves', timedActions);
    this.handleTimedGameActions(gameIndex, timedActions);
  };



  protected onChangeMode = (fromMode: GameControllerMode, toMode: GameControllerMode): void => {
    // update mode of all input managers
    for (const gameInputManagers of this.options.inputManagers) {
      for (const inputManager of gameInputManagers) {
        inputManager.setMode(toMode);
      }
    }
    // re-render on any mode change
    this.options.render(this.getState(toMode));
    // call handler
    this.options.onChangeMode(fromMode, toMode);
  };

  protected makeDummyGameCopy(gameIndex: number, state?: GameState) {
    // make a dummy game, a copy of this.games[gameIndex]
    // that we can use to replay the game history without triggering any callbacks
    const game = this.games[gameIndex];
    invariant(!!game, `Invalid game index ${gameIndex}`);

    // use the same options as existing game, but omit callbacks
    const dummyOptions: Partial<GameOptions> = omitBy(game.options, isFunction);
    const dummyGame = new Game(dummyOptions);
    if (state) {
      dummyGame.setState(state);
    }
    return dummyGame;
  }

  protected rewindGameToFrame(gameIndex: number, game: Game, frame: number) {
    invariant(this.options.hasHistory, `Cannot rewind game, options.hasHistory is false`);

    // console.log('history length', this.stateHistory.length, this.actionHistory.length);
    // use state history to "rewind" the state of the game to a given frame
    // may not have saved that exact frame, so find the nearest saved frame less tham or equal to the target,
    // start there, and tick forward through time until reaching the target frame
    let restoreState = findLast(this.stateHistory[gameIndex], gameState => gameState.frame <= frame);
    if (!restoreState) { restoreState = this.initialGameStates[gameIndex]; }
    if (restoreState !== undefined) {
      game.setState(restoreState);
      while (game.frame < frame) {
        game.tick(); // todo handle results? pass actions??!!
      }
    } else {
      throw new Error(`Could not rewind to frame ${frame} - current frame is ${game.frame}`);
    }
  }

  protected rewriteHistoryWithActions(gameIndex: number, timedActions: TimedGameActions) {
    // given a gameIndex and a list of timedActions which occurred *in the past*
    // (relative to the game's current frame), this method "rewinds" the game to
    // a frame before timedActions, then replays the game back to the current frame,
    // inserting the timedActions at the right times -
    // in effect "rewriting the game's history" to include the given past actions

    // const stateHistory = this.stateHistory;
    invariant(this.options.hasHistory, `Cannot rewrite history, options.hasHistory is false`);
    const game = this.games[gameIndex];
    invariant(!!game, `Invalid game index ${gameIndex}`);
    const [frame] = timedActions;
    const currentFrame = game.frame;
    // make a dummy game with the last saved state before timedActions
    const dummyGame = this.makeDummyGameCopy(gameIndex);
    this.rewindGameToFrame(gameIndex, dummyGame, frame - 1);

    const gameActionHistory = this.actionHistory[gameIndex];
    const gameStateHistory = this.stateHistory[gameIndex];
    // insert new frameActions at the correct place in this.actionHistory
    addTimedActionsTo(timedActions, gameActionHistory);
    // all of our state history after (frame - 1) is no longer valid - remove them from stateHistory
    const firstInvalidStateIndex = findLastIndex(gameStateHistory, state => state.frame >= frame);
    if (firstInvalidStateIndex > -1) {
      console.log("splicing state history", firstInvalidStateIndex);
      gameStateHistory.splice(firstInvalidStateIndex, gameStateHistory.length - firstInvalidStateIndex);
    }

    // find the earliest action(s) in actionHistory which happen after the game's current frame
    let nextActionsIndex = gameActionHistory.findIndex(([actionsFrame]) => actionsFrame > dummyGame.frame);
    // tick through the game, applying actions in actionHistory to appropriate frames
    while (nextActionsIndex > -1) {
      const [nextActionsFrame, nextActions] = gameActionHistory[nextActionsIndex];
      if (nextActionsFrame > currentFrame) {
        break;
      }
      tickGameToFrame(dummyGame, nextActionsFrame - 1);
      dummyGame.tick(nextActions);
      // add post-tick game state to stateHistory
      // todo refactor to not need cloneDeep? (added this to fix a bug, details of which i dont recall)
      gameStateHistory.push(cloneDeep(dummyGame.getState()));

      // get the next action in history, or break out of loop if we've done them all
      nextActionsIndex = nextActionsIndex >= gameActionHistory.length - 1 ? -1 : nextActionsIndex + 1;
    }
    // dummyGame is now at the frame of the last action in actionHistory before currentFrame
    // no more actions - tick ahead to the current frame
    // todo handle actions/results??
    tickGameToFrame(dummyGame, currentFrame);
    // done - dummyGame is at same frame as this.game, but has frameActions in its history
    // update this.game state to dummyGame's state
    this.games[gameIndex].setState(dummyGame.getState());

  }

  // public replayHistory(): void {
  //   // todo use it or lose it?
  //   const dummyGame = this.makeDummyGameCopy(cloneDeep(this.stateHistory[0]));
  //
  //   const currentFrame = this.game.frame;
  //
  //   // find the first action in actionHistory which happens after the game's current frame
  //   let nextActionsItemIndex = findIndex(this.actionHistory, ([frame]) => frame > dummyGame.frame);
  //   // tick through the game, applying actions in actionHistory to appropriate frames
  //   while (nextActionsItemIndex > -1) {
  //     const [nextActionsFrame, nextActions] = this.actionHistory[nextActionsItemIndex];
  //     if (nextActionsFrame > currentFrame) break;
  //     tickGameToFrame(dummyGame, nextActionsFrame - 1);
  //     dummyGame.tick(nextActions);
  //     // get the next action in history, or break out of loop if we've done them all
  //     nextActionsItemIndex =
  //       nextActionsItemIndex >= this.actionHistory.length - 1 ? -1 : nextActionsItemIndex + 1;
  //   }
  //   // game is now at the frame of the last action in actionHistory before currentFrame
  //   // no more actions - tick ahead to target frame
  //   tickGameToFrame(dummyGame, currentFrame);
  //
  //   // todo handle this error?
  //   if (!isEqual(this.game.getState(), dummyGame.getState()))
  //     console.error("states not equal: ", this.game.getState(), dummyGame.getState());
  // }
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

function addTimedActionsTo(timedActions: TimedGameActions, actionsList: TimedGameActions[]): void {
  // mutates actionsList to add timedActions at correct place in the list,
  // merging with existing actions if necessary
  const [addedFrame, addedActions] = timedActions;
  // find first item in list with frame >= the one we're adding
  const spliceIndex = actionsList.findIndex(([frame]) => frame >= addedFrame);
  if (spliceIndex < 0) {
    // didn't find any actions at same time or after ours - add to end of list
    actionsList.push(timedActions);
  } else {
    const [nextFrame, nextActions] = actionsList[spliceIndex];
    if (nextFrame === addedFrame) {
      // already have action(s) on the same frame, merge the lists
      const mergedActions = [...nextActions, ...addedActions];
      actionsList[spliceIndex] = [addedFrame, mergedActions];
    } else {
      // next item in the list is after addedFrame, insert item in the list before it
      actionsList.splice(spliceIndex, 0, timedActions);
    }
  }
}
