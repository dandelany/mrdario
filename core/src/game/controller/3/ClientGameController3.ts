import {
  GameController3Mode,
  GameController3Options,
  GameController3PublicState,
  GameController3State,
  GameController3TimerType
} from "./types";
import { getGetTime } from "../../../utils/time";
import { defaults, get, noop, omit, times } from "lodash";
import { assert } from "../../../utils/assert";
import {
  GameActionType,
  GameControllerActionType,
  GameControllerMovesAction,
  GameInput,
  GameInputMove,
  GameOptions,
  GameState,
  InputEventType,
  TimedGameActions,
  TimedGameTickResult
} from "../../types";
import { Game } from "../../Game";
import { isMoveInput } from "../../utils";

// ClientGameController
// Starting point for GameController 3

// Do:
//  - multiple games (1 only for now)
//  - timer - setInterval or RAF
//  - publish ClientGameControllerActions

// Don't:
//  - have SETUP
//  - use FSM
//  - have won/lost (use ended)

export const DEFAULT_CLIENT_GAME_CONTROLLER_OPTIONS: GameController3Options = {
  players: 1,
  localGames: [0],
  gameOptions: [
    {
      level: 0,
      baseSpeed: 15
    }
  ],
  hasHistory: true,
  getTime: getGetTime(),
  timerType: GameController3TimerType.SetInterval,
  timerFps: 60,
  // list of input managers, eg. of keyboard, touch events
  // these are event emitters that fire on every user game input (move)
  // moves are queued and fed into the game to control it
  inputManagers: [],
  // render function which is called when game state changes
  // this should be the main connection between game logic and presentation
  render: noop
  // callback called when state machine mode changes
  // onChangeMode: noop
};



// export class SaferMessenger {
//   constructor(socket: SCClientSocket, channelsInfo: { key: string; in: boolean; out: boolean }[]) {
//     let inChannels = channelsInfo.filter(c => c.in).map(c => socket.subscribe(c.key));
//     inChannels.forEach((channel, i) => {
//       channel.watch(this.handleMessage.bind(this, i));
//     });
//   }
//   public handleMessage(message: any) {}
// }

export class ClientGameController3 {
  public options: GameController3Options;
  protected state: GameController3State;
  protected timer?: number | NodeJS.Timeout;
  protected seed: string;
  protected getTime: () => number;

  constructor(optionsArg: Partial<GameController3Options> = {}) {
    this.options = defaults({}, optionsArg, DEFAULT_CLIENT_GAME_CONTROLLER_OPTIONS);
    const { players, localGames } = this.options;

    assert(players === 1, "Only 1 player supported so far");
    assert(localGames.length === 1 && localGames[0] === 0, "Must have exactly 1 local game");

    // function which gets the current time, for running game clock
    this.getTime = this.options.getTime;
    // common RNG seed shared between games
    this.seed = this.options.seed || Date.now().toString();

    // initialize Game options and create Game instances

    const gameOptions: Partial<GameOptions>[] = times(players, (i: number) => {
      const gameIOptions: Partial<GameOptions> = get(this.options.gameOptions, i, {});
      return {
        ...gameIOptions,
        initialSeed: this.seed
      };
    });
    const games = gameOptions.map(gameIOptions => {
      // the game instance, which does the hard work
      const game = new Game(gameIOptions);
      assert(game.frame === 0, "Game must have frame = 0 after initialization");
      return game;
    });

    // attach events from inputmanagers to the games
    this.attachInputEvents();

    this.state = {
      mode: GameController3Mode.Ready,
      gameOptions,
      games: games,
      frame: 0,
      refFrame: 0,
      refTime: this.getTime(),
      actionHistory: times(players, () => []) as TimedGameActions[][],
      futureActions: times(players, () => []) as TimedGameActions[][],
      stateHistory: times(players, () => []) as GameState[][],
      resultHistory: times(players, () => []) as TimedGameTickResult[][],

      initialGameStates: [] as GameState[]
      // initialGameStates: games.map(game => game.getState())
    };
  }

  public getState(): GameController3PublicState {
    const { games } = this.state;
    return {
      ...omit(this.state, ["games"]),
      gameStates: games.map(game => game.getState())
    };
  }
  public start() {
    if (this.state.mode === GameController3Mode.Ready) {
      this.state.mode = GameController3Mode.Playing;
      this.startTimer();
    } else console.warn(`Tried to start while in mode ${this.state.mode}`);
  }
  public cleanup() {
    this.clearTimer();
  }

  public tick = () => {
    console.log("tick");
    this.state.games.forEach(game => game.tick());
  };

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
    console.log("GameController input", input);
    console.log(isMoveInput(input));
    // todo handle other game inputs(?) - Play Pause Resume Reset
    if (isMoveInput(input)) {
      this.handleMoveInput(gameIndex, input, eventType);
    }
    // todo send move message with game client?
  };

  protected handleMoveInput = (gameIndex: number, input: GameInputMove, eventType: InputEventType) => {
    // queue a user move, to be sent to the game on the next tick
    const { state } = this;
    if (state.mode !== GameController3Mode.Playing) {
      return;
    }

    const action: GameControllerMovesAction = {
      type: GameControllerActionType.Moves,
      player: gameIndex,
      moves: [state.games[gameIndex].frame + 1, [{ type: GameActionType.Move, input, eventType }]]
    };
    // this.handleLocalAction(action);
    // TODO: add move action so it will be processed on next game tick
    console.log("handled moves", action.moves);
  };



  protected detachInputEvents() {
    // cleanup, unbind inputmanager listeners
    for (const gameInputManagers of this.options.inputManagers) {
      for (const manager of gameInputManagers) {
        manager.removeAllListeners();
      }
    }
  }

  protected startTimer() {
    // create and start the game timer, using RAF or setInterval
    // timerFps option only affects FPS when using setInterval
    const { timerType, timerFps } = this.options;
    if (timerType === GameController3TimerType.RequestAnimationFrame) {
      assert(window && window.requestAnimationFrame, "requestAnimationFrame not available");
      this.timer = window.requestAnimationFrame(this.tick);
    } else if (timerType === GameController3TimerType.SetInterval) {
      const timerInterval = 1000 / timerFps;
      this.timer = setInterval(this.tick, timerInterval);
    } else {
      throw new Error(`Unknown timer type: ${timerType}`);
    }
  }

  protected clearTimer(): boolean {
    // stop & cleanup the game timer
    if (this.timer === undefined) return false;
    if (this.options.timerType === GameController3TimerType.RequestAnimationFrame) {
      assert(window && window.cancelAnimationFrame, "cancelAnimationFrame not available");
      window.cancelAnimationFrame(this.timer as number);
    } else if (this.options.timerType === GameController3TimerType.SetInterval) {
      clearInterval(this.timer as NodeJS.Timeout);
    } else throw new Error(`Unknown timer type: ${this.options.timerType}`);
    delete this.timer;
    return true;
  }
}
