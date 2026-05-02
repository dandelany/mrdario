import { EventEmitter } from "events";
import lodash from "lodash";

import { Game, defaultGameOptions } from "./Game.js";
import { GameAction, GameActionType } from "./types/gameAction.js";
import { GameOptions, GameState, GameTickResult, GameTickResultType } from "./types/index.js";

const { defaults, times } = lodash;

export interface MultiGameOptions {
  players: number;
  seed?: string;
  gameOptions: Partial<GameOptions>[];
}

export interface MultiGameState {
  frame: number;
  gameStates: GameState[];
  result?: MultiGameResult;
}

export type MultiGameActions = GameAction[][];

export enum MultiGameResultType {
  Win = "Win",
  Lose = "Lose",
  Draw = "Draw",
}

export type MultiGameResult =
  | { type: MultiGameResultType.Win; player: number }
  | { type: MultiGameResultType.Lose; player: number }
  | { type: MultiGameResultType.Draw; players: number[] };

export interface MultiGameTickResult {
  gameResults: Array<GameTickResult | undefined>;
  result?: MultiGameResult;
}

interface MultiGameResultSummary {
  winningPlayers: number[];
  losingPlayers: number[];
  comboPlayers: number[];
}

export class MultiGame extends EventEmitter {
  // options passed in when creating the multigame
  public readonly options: MultiGameOptions;
  // one Game instance per player/playfield
  protected readonly games: Game[];
  // actions created by one frame's results and applied to the next frame
  protected readonly nextTickActions: MultiGameActions;
  // terminal result, once the multigame has ended
  protected result?: MultiGameResult;

  constructor(passedOptions: Partial<MultiGameOptions> = {}) {
    // create a multigame containing N separate Game instances
    super();
    const options: MultiGameOptions = defaults({}, passedOptions, {
      players: 2,
      seed: Date.now().toString(),
      gameOptions: [],
    });
    this.options = options;

    this.games = times(options.players, (player) => {
      const playerOptions = defaults({}, options.gameOptions[player], defaultGameOptions, {
        initialSeed: options.seed,
      });
      return new Game(playerOptions);
    });
    this.nextTickActions = times(options.players, () => []);
  }

  public tick(actionsByPlayer: MultiGameActions = []): MultiGameTickResult {
    // tick all games forward exactly one frame, passing each game its own actions
    if (this.result) {
      return {
        gameResults: this.getEmptyGameResults(),
        result: this.result,
      };
    }

    const gameResults = new Array<GameTickResult | undefined>(this.games.length);
    for (let player = 0; player < this.games.length; player++) {
      const actions = this.drainActionsForPlayer(player, actionsByPlayer[player]);
      gameResults[player] = this.games[player].tick(actions) || undefined;
    }

    return {
      gameResults,
      result: this.applyGameResults(gameResults),
    };
  }

  public getState(): MultiGameState {
    // return the public state for all games without exposing Game instances
    const [firstGame] = this.games;
    const gameStates = new Array<GameState>(this.games.length);
    for (let player = 0; player < this.games.length; player++) {
      gameStates[player] = this.games[player].getState();
    }

    return {
      frame: firstGame ? firstGame.frame : 0,
      gameStates,
      result: this.result,
    };
  }

  public setState(state: MultiGameState): void {
    // set the state of all games from a complete multigame state
    for (let player = 0; player < this.games.length; player++) {
      this.games[player].setState(state.gameStates[player]);
    }
    this.result = state.result;
    this.clearNextTickActions();
  }

  protected drainActionsForPlayer(player: number, externalActions: GameAction[] = []): GameAction[] {
    // consume derived actions queued for this player and merge them with external actions
    const queuedActions = this.nextTickActions[player];
    if (!queuedActions.length) return externalActions;

    const actions = externalActions.length ? queuedActions.concat(externalActions) : queuedActions.slice();
    this.nextTickActions[player] = [];
    return actions;
  }

  protected applyGameResults(gameResults: Array<GameTickResult | undefined>): MultiGameResult | undefined {
    // apply per-game results to multigame state and return any terminal result
    const summary = this.getResultSummary(gameResults);
    const endResult = this.getEndResult(summary);
    if (endResult) {
      this.result = endResult;
      this.clearNextTickActions();
      return endResult;
    }

    this.queueGarbageFromCombos(gameResults, summary.comboPlayers);
    return undefined;
  }

  protected getResultSummary(gameResults: Array<GameTickResult | undefined>): MultiGameResultSummary {
    // collect same-frame result facts once so arbitration stays explicit
    const winningPlayers: number[] = [];
    const losingPlayers: number[] = [];
    const comboPlayers: number[] = [];
    for (let player = 0; player < gameResults.length; player++) {
      const result = gameResults[player];
      if (!result) continue;

      switch (result.type) {
        case GameTickResultType.Win:
          winningPlayers.push(player);
          break;
        case GameTickResultType.Lose:
          losingPlayers.push(player);
          break;
        case GameTickResultType.Combo:
          comboPlayers.push(player);
          break;
      }
    }

    return { winningPlayers, losingPlayers, comboPlayers };
  }

  protected getEndResult(summary: MultiGameResultSummary): MultiGameResult | undefined {
    // winning supersedes losing/garbage because the multigame is over
    const winResult = this.getPlayerResult(summary.winningPlayers, MultiGameResultType.Win);
    if (winResult) return winResult;

    return this.getPlayerResult(summary.losingPlayers, MultiGameResultType.Lose);
  }

  protected getPlayerResult(
    players: number[],
    resultType: MultiGameResultType.Win | MultiGameResultType.Lose
  ): MultiGameResult | undefined {
    // convert one-or-many player indices into win/lose/draw semantics
    if (players.length === 1) {
      return { type: resultType, player: players[0] };
    }
    if (players.length > 1) {
      return { type: MultiGameResultType.Draw, players };
    }
    return undefined;
  }

  protected queueGarbageFromCombos(
    gameResults: Array<GameTickResult | undefined>,
    comboPlayers: number[]
  ): void {
    // combos give garbage to every other player on the next multigame tick
    for (let i = 0; i < comboPlayers.length; i++) {
      const comboPlayer = comboPlayers[i];
      const result = gameResults[comboPlayer];
      if (!result || result.type !== GameTickResultType.Combo) {
        throw new Error(`expected combo result for player ${comboPlayer}`);
      }
      const comboColors = result.colors;

      for (let targetPlayer = 0; targetPlayer < this.games.length; targetPlayer++) {
        if (targetPlayer === comboPlayer) continue;
        this.nextTickActions[targetPlayer].push({
          type: GameActionType.Garbage,
          colors: comboColors,
        });
      }
    }
  }

  protected clearNextTickActions(): void {
    // discard derived actions when the whole multigame state is overwritten
    for (let player = 0; player < this.nextTickActions.length; player++) {
      this.nextTickActions[player] = [];
    }
  }

  protected getEmptyGameResults(): Array<GameTickResult | undefined> {
    // return an explicit no-op result array without ticking ended games
    const gameResults = new Array<GameTickResult | undefined>(this.games.length);
    for (let player = 0; player < this.games.length; player++) {
      gameResults[player] = undefined;
    }
    return gameResults;
  }
}
