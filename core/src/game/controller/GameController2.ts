import {
  cloneDeep,
  defaults,
  every,
  findIndex,
  findLast,
  findLastIndex,
  get,
  isFunction,
  noop,
  omit,
  omitBy,
  times
} from "lodash";
import { invariant } from "ts-invariant";

import { InputManager } from "../input/types";

import { getGetTime } from "../../utils/time";
import { Game } from "../Game";
import {
  GameActionType,
  GameControllerAction,
  GameControllerActionType,
  GameControllerEndAction,
  GameControllerMovesAction,
  GameControllerReadyAction,
  GameControllerSettingsAction,
  GameControllerStartAction,
  GameInput,
  GameInputMove,
  GameOptions,
  GameState,
  GameTickResult,
  GameTickResultCombo,
  GameTickResultLose,
  GameTickResultType,
  GameTickResultWin,
  InputEventType,
  TimedGameActions,
  TimedGameTickResult,
  TimedMoveActions
} from "../types";
import { isMoveAction, isMoveInput } from "../utils";
import { GameAction, GameActionMove } from "../types/gameAction";
import { assert } from "../../utils/assert";
import produce from "immer";

export interface GameControllerOptions {
  // number of players (ie. number of games)
  players: number;
  seed?: string;
  gameOptions: Partial<GameOptions>[];
  hasHistory: boolean;
  getTime: () => number;
  // each game may provide its own inputmanagers
  inputManagers: InputManager[][];
  render: (state: GameControllerPublicState, dt?: number) => any;
  onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => any;
  onMoveActions?: (gameIndex: number, timedMoveActions: TimedMoveActions) => void;

  onLocalAction?: (action: GameControllerAction) => void;
  onRemoteAction?: (action: GameControllerAction) => void;
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
  // Ready = "Ready",
  // Countdown = "Countdown",
  Playing = "Playing",
  Paused = "Paused",
  Ended = "Ended"
}

export interface BaseGameControllerState {
  mode: GameControllerMode;
  gameOptions: Partial<GameOptions>[];
}

export interface GameControllerSetupState extends BaseGameControllerState {
  mode: GameControllerMode.Setup;
  playersReady: boolean[];
}

export interface GameControllerInitializedState extends BaseGameControllerState {
  mode: // | GameControllerMode.Ready
  GameControllerMode.Playing | GameControllerMode.Paused | GameControllerMode.Ended;
  playersReady: true[];
  games: Game[];
  frame: number;
  refFrame: number;
  refTime: number;
  // these are [][]s because they have one array per game
  futureActions: TimedGameActions[][];
  actionHistory: TimedGameActions[][];
  stateHistory: GameState[][];
  initialGameStates: GameState[];

  resultHistory: TimedGameTickResult[][];
}

export type GameControllerState = GameControllerSetupState | GameControllerInitializedState;

export type GameControllerPublicInitializedState = Omit<GameControllerInitializedState, "games"> & {
  gameStates: GameState[];
};
export type GameControllerPublicState = GameControllerSetupState | GameControllerPublicInitializedState;

// import { encodeTimedActions } from "../../encoding/action";

// game controller class
// controls the frame timing and must tick the Game object once per frame
// handles inputs and passes them into the Game
// controls the high-level game state and must call render() when game state changes

export const defaultOptions = DEFAULT_GAME_CONTROLLER_OPTIONS;

export class GameController {
  public options: GameControllerOptions;
  // public gameOptions: Array<Partial<GameOptions>>;
  public getTime: () => number;

  protected seed: string;
  // protected playersReady: boolean[];
  // protected games: Game[];
  // protected frame: number;
  // protected refTime: number;
  // protected refFrame: number;
  // protected fsm: TypeState.FiniteStateMachine<GameControllerMode>;

  protected state: GameControllerState;

  // these are [][]s because they have one array per game
  // protected futureActions: TimedGameActions[][];
  // protected actionHistory: TimedGameActions[][];
  // protected stateHistory: GameState[][];
  // protected initialGameStates: GameState[];

  constructor(passedOptions: Partial<GameControllerOptions> = {}) {
    const options: GameControllerOptions = defaults({}, passedOptions, defaultOptions);
    this.options = options;

    this.seed = options.seed || Date.now().toString();

    // this.gameOptions = [];
    // this.games = [];
    // times(options.players, (i: number) => {
    //   const gameIOptions: Partial<GameOptions> = get(options.gameOptions, i, {});
    //   // RNG seed is the same for all games
    //   gameIOptions.initialSeed = this.seed;
    //   this.gameOptions[i] = gameIOptions;
    //   // the game instance, which does the hard work
    //   this.games[i] = this.initGame(gameIOptions);
    //   invariant(this.games[i].frame === 0, "Game must have frame = 0 after initialization");
    // });
    // this.frame = 0;

    // boolean indicating whether each player is ready to start the game (ie. has sent Ready action)
    // this.playersReady = times(options.players, () => false);

    // a finite state machine representing game controller mode, & transitions between modes
    // this.fsm = this.initStateMachine();

    // attach events from inputmanagers to the game
    this.attachInputEvents();

    // function which gets the current time, for running game clock
    this.getTime = options.getTime;

    // const emptyArrayForEachGame = () => this.games.map(() => []);
    // this.actionHistory = emptyArrayForEachGame() as TimedGameActions[][];
    // this.futureActions = emptyArrayForEachGame() as TimedGameActions[][];
    // this.stateHistory = emptyArrayForEachGame() as GameState[][];
    // this.initialGameStates = this.games.map(game => game.getState());

    // this.refFrame = 0;
    // this.refTime = this.getTime();

    const gameOptions: Partial<GameOptions>[] = times(options.players, (i: number) => {
      const gameIOptions: Partial<GameOptions> = get(options.gameOptions, i, {});
      return {
        ...gameIOptions,
        initialSeed: this.seed
      };
    });

    this.state = {
      mode: GameControllerMode.Setup,
      playersReady: times(options.players, () => false),
      gameOptions
    };
  }

  public handleLocalAction(action: GameControllerAction) {
    // handler for GameControllerActions which come from inside the GameController
    // can also be called by local user to eg. pause/resume
    // but not to be used for actions from the network (see handleRemoteAction),
    // onLocalAction may be used to send actions over the network
    this.handleAction(action);
    if(this.options.onLocalAction) this.options.onLocalAction(action);
  }

  public handleRemoteAction(action: GameControllerAction) {
    // opposite of handleLocalAction above
    // used solely to denote (via callbacks) which actions cone from network vs. local user
    this.handleAction(action);
    if(this.options.onLocalAction) this.options.onLocalAction(action);
  }

  public getState(): GameControllerPublicState {
    if (this.state.mode === GameControllerMode.Setup) {
      return this.state;
    } else {
      // don't return game instances, instead call getState on each game and return gameStates
      const { games } = this.state;
      return {
        ...omit(this.state, ["games"]),
        gameStates: games.map(game => game.getState())
      };
    }
  }

  public cleanup() {
    // cleanup the game when we're done
    // unbind inputmanager listeners
    for (const gameInputManagers of this.options.inputManagers) {
      for (const manager of gameInputManagers) {
        manager.removeAllListeners();
      }
    }
    // todo stop timer
  }


  protected handleAction(action: GameControllerAction) {
    // main GameControllerAction handler
    // private method - call via handleLocalAction or handleRemoteAction
    console.log(`${action.type} action:`, action);

    switch (action.type) {
      case GameControllerActionType.Settings:
        this.handleSettings(action);
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
      case GameControllerActionType.End:
        this.handleEnd(action);
        break;
    }
  }

  protected handleSettings(action: GameControllerSettingsAction) {
    const state = this.state;
    assert(
      state.mode === GameControllerMode.Setup,
      `Can only handle Settings action in Setup mode (currently ${state.mode})`
    );
    this.assertValidPlayer(action.player);

    console.log(action.type, action.player, action.settings);
    const gameIndex = action.player;
    const gameIOptions = state.gameOptions[gameIndex];

    // update this.state.gameOptions[i] to reflect action.settings
    this.state = produce(state, draftState => {
      draftState.gameOptions[gameIndex] = {
        ...gameIOptions,
        ...action.settings,
        initialSeed: this.seed
      };
    });

    console.log(this.state);
  }



  // protected setState(state: Partial<GameControllerInternalState>) {
  //   // const nextState =
  //   this.state = {...this.state, ...state};
  // }

  protected handleReady(action: GameControllerReadyAction) {
    // ensure we are in correct mode and action is for valid player
    const { state } = this;
    assert(
      state.mode === GameControllerMode.Setup,
      `Can only handle Ready action in Setup mode (currently ${state.mode})`
    );
    this.assertValidPlayer(action.player);

    // set player ready state
    const nextState = produce(state, nextState => {
      nextState.playersReady[action.player] = action.ready;
    });
    this.state = nextState;

    // fire Start action if all players are ready
    if (every(nextState.playersReady)) {
      setTimeout(() => {
        this.handleAction({ type: GameControllerActionType.Start });
      }, 0);
    }
  }

  protected handleStart(action: GameControllerStartAction) {
    const { state } = this;
    assert(
      state.mode === GameControllerMode.Setup,
      `Can only handle Start action in Setup mode (currently ${state.mode})`
    );
    // create game instances and start the game(s)

    const { players } = this.options;
    const games = this.initGames();
    const nextState: GameControllerInitializedState = {
      ...state,
      mode: GameControllerMode.Playing,
      games,
      frame: 0,
      refFrame: 0,
      refTime: this.getTime(),
      playersReady: times(players, () => true),
      actionHistory: times(players, () => []) as TimedGameActions[][],
      futureActions: times(players, () => []) as TimedGameActions[][],
      stateHistory: times(players, () => []) as GameState[][],
      resultHistory: times(players, () => []) as TimedGameTickResult[][],
      initialGameStates: games.map(game => game.getState())
    };

    this.state = nextState;

    console.log(this.getState());
    console.log(action.type);
  }

  protected handleMoves(action: GameControllerMovesAction) {
    // todo handle moves action
    console.log(action.type, action.player, action.moves);
    this.handleTimedGameActions(action.player, action.moves);
  }

  protected handleEnd(action: GameControllerEndAction) {
    // todo handle end action
    console.log(action.type);
  }

  protected assertValidPlayer(player: number) {
    const { players } = this.options;
    assert(player < players, `Invalid player index ${player} (${players}-player game)`);
  }

  // public play() {
  //   this.fsm.go(GameControllerMode.Playing);
  // }
  // public setStartTime(startTime: number) {
  //   this.refTime = startTime;
  // }
  // public startCountdown(delay?: number) {
  //   if (delay !== undefined && Number.isFinite(delay)) {
  //     this.refTime = this.getTime() + delay;
  //   }
  //   this.fsm.go(GameControllerMode.Countdown);
  // }

  public tick(): void {
    // called once per frame
    const { state } = this;
    if (state.mode !== GameControllerMode.Playing) return;

    const now = this.getTime();
    const { refFrame, refTime } = state;

    // calculate the expected game frame we should be at now,
    // and tick the game until it matches the expected frame
    // this allows the number of ticks to stay consistent over time
    // even if FPS changes or lags due to performance
    // const frame = this.games[0].frame;
    const expectedFrame = Math.floor((now - refTime) / (1000 / 60)) + refFrame;
    // const frameDiff = expectedFrame - frame;
    // if (frameDiff > 6000) {
    //   console.error("GameController ticks got out of sync");
    // }
    // if (Math.abs(frameDiff) > 1) {
    //   console.log("frame off by", expectedFrame - frame);
    // }

    this.tickToFrame(expectedFrame);

    // render with the current game state
    this.options.render(this.getState());
    // this.last = now;
    // requestAnimationFrame(this.tick.bind(this));

  }

  public tickToFrame(toFrame: number): void {
    const { state } = this;
    assert(state.mode === GameControllerMode.Playing, "tickToFrame can't be called when not Playing");

    const frameDiff = toFrame - state.frame;
    invariant(
      frameDiff >= 0,
      `tickToFrame can't tick to an earlier frame (this.frame ${state.frame}, toFrame ${toFrame})`
    );

    for (let i = 0; i < frameDiff; i++) {
      this.tickGames();
    }
  }

  public tickGames() {
    const { state } = this;
    assert(state.mode === GameControllerMode.Playing);

    const nextFrame = state.frame + 1;
    let results = [];
    for (let i = 0; i < state.games.length; i++) {
      const result = this.tickGame(i) || undefined;
      results.push(result);
      if (result) this.handleGameTickResult(i, result, nextFrame);
    }

    // todo add to results history?
    // gamesTickResults[j].push([this.frame, result]);

    // if any of the game ticks had results,
    // process them and queue up any actions they created for the next tick
    const nextTickActions = this.processGameResults(results);
    for (let i = 0; i < nextTickActions.length; i++) {
      const nextAction = nextTickActions[i];
      if(nextAction) {
        // todo make sure this works - or nextFrame + 1??
        this.handleTimedGameActions(i, [nextFrame, [nextAction]])
      }
    }

    this.state = produce(state, next => {
      next.frame += 1;
    });
  }


  protected tickGame(gameIndex: number): void | GameTickResult {
    const { state } = this;
    assert(state.mode === GameControllerMode.Playing);
    this.assertValidPlayer(gameIndex);

    const { games, futureActions } = state;
    const game = games[gameIndex];
    const gameFutureActions = futureActions[gameIndex];

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
      const gameActionHistory = state.actionHistory[gameIndex];
      const gameStateHistory = state.stateHistory[gameIndex];
      const frameActions: TimedGameActions = [game.frame, actions];
      // console.log("history item", frameActions);
      // console.log(this.actionHistory.map(item => encodeTimedActions(item)).join(";"));
      // console.log(this.actionHistory, this.stateHistory);
      gameActionHistory.push(frameActions);
      // todo still need to cloneDeep?
      gameStateHistory.push(cloneDeep(game.getState()));
      // todo limit length of stored stateHistory
    }

    return tickResult;
  }


  protected handleGameTickResult(gameIndex: number, result: GameTickResult, frame: number) {
    switch (result.type) {
      case GameTickResultType.Win:
        this.handleWinResult(gameIndex, result, frame);
        break;
      case GameTickResultType.Lose:
        this.handleLoseResult(gameIndex, result, frame);
        break;
      case GameTickResultType.Combo:
        this.handleComboResult(gameIndex, result, frame);
        break;
      default:
        throw new Error(`Unexpected GameTickResult: ${result}`);
    }

    // this.state = produce(this.state, next => {
    //   next.
    // })
  }
  protected handleWinResult(gameIndex: number, result: GameTickResultWin, frame: number) {
    // todo handle win
    console.log("WIN", gameIndex, result, frame);
  }
  protected handleLoseResult(gameIndex: number, result: GameTickResultLose, frame: number) {
    // todo handle lose
    console.log("LOSE", gameIndex, result, frame);
  }
  protected handleComboResult(gameIndex: number, result: GameTickResultCombo, frame: number) {
    // todo handle lose
    console.log("COMBO", gameIndex, result, frame);
  }



  // public run() {
  //   // called when gameplay starts, to initialize the game loop
  //   // this.last = timestamp();
  //   this.refFrame = 0;
  //   this.refTime = this.getTime();
  //   // todo update refFrame/refTime when the game is paused
  //
  //   // todo allow passed rAF / setinterval
  //   requestAnimationFrame(this.tick.bind(this));
  // }

  protected initGames() {
    const { players } = this.options;
    const games: Game[] = times(players, (i: number) => {
      const gameIOptions: Partial<GameOptions> = this.state.gameOptions[i];
      // the game instance, which does the hard work
      const game = new Game({ ...gameIOptions });
      assert(game.frame === 0, "Game must have frame = 0 after initialization");
      return game;
    });
    return games;
  }

  // protected initStateMachine(

  //   // Countdown
  //   // fsm.on(GameControllerMode.Countdown, this.onCountdown);
  //   // Play
  //   fsm.on(GameControllerMode.Playing, () => {
  //     this.run();
  //   });
  //   // todo Reset?
  //   // fsm.on(GameControllerMode.Ready, () => {
  //   //   this.game = this.initGame();
  //   // });
  //   fsm.on(GameControllerMode.Playing, from => {
  //     if (from === GameControllerMode.Paused) {
  //       // Resume
  //       // tick to get the game started again after being paused
  //       this.tick();
  //     }
  //   });
  //
  //   fsm.onTransition = (from: GameControllerMode, to: GameControllerMode) => {
  //     this.onChangeMode(from, to);
  //   };
  //
  //   return fsm;
  // }

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

  // protected initGame(gameOptions: Partial<GameOptions>): Game {
  //   return new Game({ ...gameOptions });
  // }

  protected attachInputEvents(): void {
    const { inputManagers } = this.options;
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
    const { state } = this;
    if (state.mode !== GameControllerMode.Playing) {
      return;
    }

    // add move action so it will be processed on next game tick
    const action: GameControllerMovesAction = {
      type: GameControllerActionType.Moves,
      player: gameIndex,
      moves: [
        state.games[gameIndex].frame + 1,
        [{ type: GameActionType.Move, input, eventType }]
      ]
    };
    this.handleLocalAction(action);
    console.log('handled moves', action);
  };

  protected onChangeMode = (fromMode: GameControllerMode, toMode: GameControllerMode): void => {
    // todo ????!!

    // update mode of all input managers
    for (const gameInputManagers of this.options.inputManagers) {
      for (const inputManager of gameInputManagers) {
        inputManager.setMode(toMode);
      }
    }
    // re-render on any mode change
    this.options.render(this.getState());
    // call handler
    this.options.onChangeMode(fromMode, toMode);
  };
  protected processGameResults(results: (GameTickResult | undefined)[]): (GameAction | undefined)[] {
    // given a list of game results (N different games, results of same frame for all games)
    // determine if the results will cause actions for other games on the next tick
    // return a list of actions for next tick (one per game), or undefined if no action
    // eg. if game[0] gets a combo result, returns a garbage action for games[1]

    // todo should handle "Draw" (ie. sinultaneous win) - need Draw action first
    const gameCount = results.length;

    function findResultIndex(resultType: GameTickResultType) {
      return findIndex(results, res => !!res && res.type === resultType);
    }
    function findAllResultIndices(resultType: GameTickResultType): number[] {
      let resultIndices = [] as number[];
      for (let i = 0; i < results.length; i++) {
        const maybeResult = results[i];
        if(!!maybeResult && maybeResult.type === resultType)
          resultIndices.push(i);
      }
      return resultIndices;
    }

    // if any player has won, all other players lose
    const winIndex = findResultIndex(GameTickResultType.Win);
    if (winIndex > -1) {
      // losing players get Defeat action
      return times(gameCount, gameIndex => {
        return gameIndex === winIndex ? undefined : { type: GameActionType.Defeat };
      });
    }

    // if any player has lost, all other players win
    // todo should have better handling for >2 players - ForfeitWin only when *all* other players lose
    const loseIndex = findResultIndex(GameTickResultType.Lose);
    if (loseIndex > -1) {
      // non-losing players get ForfeitWin action
      return times(gameCount, gameIndex => {
        return gameIndex === loseIndex ? undefined : { type: GameActionType.Defeat };
      });
    }

    // default - no results, no actions
    let nextActions =  times<undefined | GameAction>(gameCount, () => undefined);

    // if any player(s) get combo, another player gets garbage
    const comboIndices = findAllResultIndices(GameTickResultType.Combo);
    for(let comboIndex of comboIndices) {
      const comboResult = results[comboIndex];
      assert(comboResult && comboResult.type === GameTickResultType.Combo);
      // give garbage to next player, use % to wraparound
      const garbageIndex = (comboIndex + 1) % gameCount;
      // garbage should have same colors as combo colors
      nextActions[garbageIndex] = {type: GameActionType.Garbage, colors:comboResult.colors}
    }

    return nextActions;
  }

  protected handleTimedGameActions(gameIndex: number, timedActions: TimedGameActions) {
    const { state } = this;
    assert(state.mode === GameControllerMode.Playing);
    this.assertValidPlayer(gameIndex);

    const { games, futureActions } = state;
    const game = games[gameIndex];
    assert(!!game, `Invalid game at ${gameIndex}`);
    const [frame] = timedActions;

    if (frame > game.frame) {
      // action(s) are in the future, add them to the future actions queue
      // console.log("adding future action for frame:", frame);
      const gameFutureActions = futureActions[gameIndex];
      addTimedActionsTo(timedActions, gameFutureActions);
    } else {
      // action(s) are in past (or present) tick
      // update the game state by rewriting game history to include the past actions
      console.log("action happened in past frame:", frame);
      assert(this.options.hasHistory, `Action happened in the past and hasHistory is false`);
      this.rewriteHistoryWithActions(gameIndex, timedActions);
    }
    // this.actionHistory.map(encodeTimedActions);
  }

  protected rewriteHistoryWithActions(gameIndex: number, timedActions: TimedGameActions) {
    const { state } = this;
    assert(state.mode !== GameControllerMode.Setup);
    assert(this.options.hasHistory, `Cannot rewrite history, options.hasHistory is false`);

    // given a gameIndex and a new timedActions which occurred *in the past*
    // (relative to the game's current frame), this method "rewinds" all games to
    // a frame before timedActions, then replays the games back to the current frame,
    // inserting the timedActions at the right times -
    // in effect "rewriting the game's history" to include the given past actions
    // note that this replays all games, not just games[gameIndex], because new action could
    // affect results which affect other games.

    const { games, actionHistory, stateHistory, resultHistory } = state;

    const game = games[gameIndex];
    assert(!!game, `Invalid game index ${gameIndex}`);
    const [frame] = timedActions;
    const currentFrame = game.frame;

    // make dummy games with last state before timedActions
    // todo fix this, need to rewind in lockstep - rewindDummyGamesToFrame?
    const dummyGames = games.map(g => this.makeDummyGameCopy(g));
    dummyGames.forEach((dummy, i) => {
      this.rewindGameToFrame(i, dummy, frame - 1);
    });

    // insert new frameActions at the correct place in affected game's actionHistory
    addTimedActionsTo(timedActions, actionHistory[gameIndex]);

    // all games' stateHistory and resultHistory after `frame - 1` are no longer valid
    // clear them, we will regenerate by replaying dummy games
    // also scrub actionHistory, removing internal actions but keeping external actions (moves)
    games.forEach((_game, curIndex) => {
      const curGameStateHistory = stateHistory[curIndex];
      const curResultHistory = resultHistory[curIndex];
      const curGameActionHistory = actionHistory[curIndex];

      // remove all states after frame - 1 from game stateHistory
      // mutates curGameStateHistory
      const firstInvalidStateIndex = findLastIndex(curGameStateHistory, state => state.frame >= frame);
      if (firstInvalidStateIndex > -1) {
        console.log("splicing state history", firstInvalidStateIndex);
        curGameStateHistory.splice(
          firstInvalidStateIndex,
          curGameStateHistory.length - firstInvalidStateIndex
        );
      }
      // remove all results after frame - 1 from game resultHistory
      // mutates curResultHistory
      const firstInvalidResultIndex = findLastIndex(curResultHistory, ([resFrame]) => resFrame >= frame);
      if (firstInvalidResultIndex > -1) {
        console.log("splicing result history", firstInvalidResultIndex);
        curResultHistory.splice(firstInvalidResultIndex, curResultHistory.length - firstInvalidResultIndex);
      }

      // remove all internal gameactions (garbage, defeat, forfeitwin) after frame - 1
      // from actionHistory - keep external actions
      // mutates curGameActionHistory
      const iFirstActionAfterFrame = findLastIndex(curGameActionHistory, ([actFrame]) => actFrame >= frame);
      if (iFirstActionAfterFrame > -1) {
        const actionsAfterFrame = curGameActionHistory.splice(
          iFirstActionAfterFrame,
          curGameActionHistory.length - iFirstActionAfterFrame
        );
        for (let timedActions of actionsAfterFrame) {
          const [actFrame, actions] = timedActions;
          const externalActions = actions.filter(isExternalGameAction);
          if (externalActions.length) curGameActionHistory.push([actFrame, externalActions]);
        }
      }
    });

    // all of our state history after (frame - 1) is no longer valid - remove them from stateHistory
    // const firstInvalidStateIndex = findLastIndex(gameStateHistory, state => state.frame >= frame);
    // if (firstInvalidStateIndex > -1) {
    //   console.log("splicing state history", firstInvalidStateIndex);
    //   gameStateHistory.splice(firstInvalidStateIndex, gameStateHistory.length - firstInvalidStateIndex);
    // }

    let dummyFrame = dummyGames[0].frame;
    while(dummyFrame < currentFrame) {
      // tick each dummy game, taking timed actions from actionHistory
      const frameResults = dummyGames.map((dummyGame, i): GameTickResult | undefined => {
        // todo! optimize - don't search entire history on every frame!
        //   eg. find the earliest action(s) in actionHistory which happen after the game's current frame
        const frameActions = actionHistory[i].find(([aFrame]) => aFrame === dummyGame.frame);
        // tick game, with or without actions, returning result
        if(frameActions) {
          // save (post-tick) game state to stateHistory if we have actions for this frame
          const result = dummyGame.tick(frameActions[1]) || undefined;
          // todo refactor to not need cloneDeep? (added this to fix a bug, details of which i dont recall)
          stateHistory[i].push(cloneDeep(dummyGame.getState()));
          return result;
        }
        return dummyGame.tick() || undefined;
      });

      // process dummy game results
      // add any resulting actions to relevant games' actionHistory for next tick
      const nextFrameActions = this.processGameResults(frameResults);
      for(let i = 0; i < nextFrameActions.length; i++) {
        const nextAction = nextFrameActions[i];
        if(nextAction) addTimedActionsTo([dummyFrame + 1, [nextAction]], actionHistory[i]);
      }
      // todo add to resultHistory or deprecate resultHistory?
      // todo!! handle case of LAST frame before current - should action go in futureActions??

      dummyFrame += 1;
    }
    // done - dummyGames are at same frame as this.game, but have frameActions in their history
    // set our true state.games' Game states to the dummy game states
    for(let i = 0; i < state.games.length; i++) {
      state.games[i].setState(dummyGames[i].getState());
    }
  }

  protected makeDummyGameCopy(game: Game, state?: GameState): Game {
    // make a dummy game, a copy game
    // that we can use to replay the game history without triggering any callbacks
    // use the same options as existing game, but omit callbacks
    const dummyOptions: Partial<GameOptions> = omitBy(game.options, isFunction);
    const dummyGame = new Game(dummyOptions);
    // set dummy game state if given
    if (state) dummyGame.setState(state);

    return dummyGame;
  }

  protected rewindGameToFrame(gameIndex: number, game: Game, frame: number) {
    // use state history to "rewind" the state of the game to a given frame
    // may not have saved that exact frame, so find the nearest saved frame less tham or equal to the target,
    // start there, and tick forward through time until reaching the target frame

    const { state } = this;
    assert(state.mode !== GameControllerMode.Setup);
    assert(this.options.hasHistory, `Cannot rewind game, options.hasHistory is false`);

    const { stateHistory, initialGameStates } = state;
    // console.log('history length', this.stateHistory.length, this.actionHistory.length);

    let restoreState = findLast(stateHistory[gameIndex], gameState => gameState.frame <= frame);
    if (!restoreState) {
      restoreState = initialGameStates[gameIndex];
    }
    if (restoreState !== undefined) {
      game.setState(restoreState);
      // game is now at last known state before frame
      // todo: tick ahead to frame, take actions from actionsHistory
      //   but ignore results (we already have them in resultsHistory)
      while (game.frame < frame) {
        game.tick(); // todo handle pass actions??!!
      }
    } else {
      throw new Error(`Could not rewind to frame ${frame} - current frame is ${game.frame}`);
    }
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

// function tickGameToFrame(game: Game, frame: number): void {
//   // todo handle result!!
//   if (frame < game.frame) {
//     throw new Error(`Game is at frame ${game.frame} - cannot tick to ${frame}`);
//   }
//   if (frame === game.frame) {
//     return;
//   }
//   while (frame > game.frame) {
//     game.tick();
//   }
// }

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

function isExternalGameAction(action: GameAction) {
  const { type } = action;
  return type === GameActionType.Move || type === GameActionType.Seed;
}
