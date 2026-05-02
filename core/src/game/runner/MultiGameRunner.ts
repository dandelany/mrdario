import lodash from "lodash";

import {
  MultiGame,
  MultiGameActions,
  MultiGameOptions,
  MultiGameState,
  MultiGameTickResult,
} from "../MultiGame.js";
import { GameAction } from "../types/gameAction.js";
import { GameOptions } from "../types/types.js";
import { TimedActionBatch, TimedActionSource } from "./types.js";

const { cloneDeep } = lodash;

export enum MultiGameRunnerMode {
  Setup = "Setup",
  Playing = "Playing",
  Paused = "Paused",
  Ended = "Ended",
}

export interface MultiGameRunnerOptions {
  players: number;
  seed?: string;
  gameOptions?: Partial<GameOptions>[];
  multiGameFactory?: (options: Partial<MultiGameOptions>) => MultiGame;
}

export interface MultiGameRunnerState {
  mode: MultiGameRunnerMode;
  frame: number;
  playersReady: boolean[];
  gameOptions: Partial<GameOptions>[];
  multiGame?: MultiGameState;
}

export interface MultiGameRunnerObserver {
  onState?: (state: MultiGameRunnerState) => void;
  onTick?: (result: MultiGameTickResult) => void;
}

interface PlayerTimedActionBatch extends TimedActionBatch {
  player: number;
}

// local clock/action shell around one MultiGame.
// history can be added here later by replaying external actionHistory into MultiGame snapshots.
export class MultiGameRunner {
  // seed shared by every game inside the multigame
  protected readonly seed: string;
  // number of player playfields owned by the multigame
  protected readonly players: number;
  // factory seam for tests and later remote/server variants
  protected readonly multiGameFactory: (options: Partial<MultiGameOptions>) => MultiGame;
  // observers used by ui/tests to receive state and tick results
  protected readonly observers = new Set<MultiGameRunnerObserver>();
  // high-level lifecycle mode for the local runner clock
  protected mode = MultiGameRunnerMode.Setup;
  // setup readiness, kept outside MultiGame because it is not simulation state
  protected playersReady: boolean[];
  // per-player game options used when constructing MultiGame
  protected gameOptions: Partial<GameOptions>[];
  // single deterministic multiplayer simulation owned by this runner after start
  protected multiGame?: MultiGame;
  // frame-stamped external actions waiting to be applied
  protected futureActions: PlayerTimedActionBatch[] = [];
  // retained external action log; this is the future rollback/replay ingress
  protected actionHistory: PlayerTimedActionBatch[] = [];
  // current multigame frame; mirrors MultiGame state after start
  protected frame = 0;

  constructor(options: MultiGameRunnerOptions) {
    // create a setup-mode runner; start() creates the actual MultiGame
    this.players = options.players;
    this.seed = options.seed || Date.now().toString();
    this.multiGameFactory =
      options.multiGameFactory || ((multiGameOptions) => new MultiGame(multiGameOptions));
    this.playersReady = new Array<boolean>(options.players);
    this.gameOptions = new Array<Partial<GameOptions>>(options.players);

    for (let player = 0; player < options.players; player++) {
      this.playersReady[player] = false;
      this.gameOptions[player] = {
        ...(options.gameOptions?.[player] || {}),
        initialSeed: this.seed,
      };
    }
  }

  public observe(observer: MultiGameRunnerObserver): () => void {
    // subscribe to runner updates and immediately publish current state
    this.observers.add(observer);
    observer.onState?.(this.getState());
    return () => this.observers.delete(observer);
  }

  public getState(): MultiGameRunnerState {
    // expose serializable-ish state without exposing the live MultiGame object
    return {
      mode: this.mode,
      frame: this.frame,
      playersReady: this.playersReady.slice(),
      gameOptions: cloneDeep(this.gameOptions),
      multiGame: this.multiGame?.getState(),
    };
  }

  public setPlayerSettings(player: number, settings: Partial<GameOptions>): void {
    // update setup options before the multigame exists
    this.assertSetup();
    this.assertValidPlayer(player);
    this.gameOptions[player] = {
      ...this.gameOptions[player],
      ...settings,
      initialSeed: this.seed,
    };
    this.emitState();
  }

  public setPlayerReady(player: number, ready: boolean): void {
    // update readiness without starting automatically
    this.assertSetup();
    this.assertValidPlayer(player);
    this.playersReady[player] = ready;
    this.emitState();
  }

  public arePlayersReady(): boolean {
    // return true only after every player has opted in
    for (let player = 0; player < this.playersReady.length; player++) {
      if (!this.playersReady[player]) return false;
    }
    return true;
  }

  public startIfReady(): boolean {
    // explicit helper for local flows that start as soon as everyone is ready
    if (!this.arePlayersReady()) return false;
    this.start();
    return true;
  }

  public start(): void {
    // create the MultiGame and enter playing mode
    this.assertSetup();
    this.multiGame = this.multiGameFactory({
      players: this.players,
      seed: this.seed,
      gameOptions: this.gameOptions,
    });
    this.mode = MultiGameRunnerMode.Playing;
    for (let player = 0; player < this.playersReady.length; player++) {
      this.playersReady[player] = true;
    }
    this.futureActions = [];
    this.actionHistory = [];
    this.frame = 0;
    this.emitState();
  }

  public pause(): void {
    // pause the local clock without touching simulation state
    if (this.mode !== MultiGameRunnerMode.Playing) return;
    this.mode = MultiGameRunnerMode.Paused;
    this.emitState();
  }

  public resume(): void {
    // resume the local clock after pause
    if (this.mode !== MultiGameRunnerMode.Paused) return;
    this.mode = MultiGameRunnerMode.Playing;
    this.emitState();
  }

  public addPlayerActions(player: number, batch: TimedActionBatch): void {
    // queue one player's external actions for a future frame
    this.assertPlayingOrPaused();
    this.assertValidPlayer(player);
    if (batch.actions.length === 0) return;

    const source = batch.source || TimedActionSource.External;
    if (source !== TimedActionSource.External) {
      throw new Error(`MultiGameRunner only accepts external actions, got ${source}`);
    }
    if (batch.frame <= this.frame) {
      throw new Error(
        `late actions require rollback. current frame ${this.frame}, action frame ${batch.frame}`
      );
    }

    const nextBatch = {
      frame: batch.frame,
      actions: cloneDeep(batch.actions),
      source,
      player,
    };
    this.insertActionBatch(nextBatch, this.futureActions);
    this.insertActionBatch(cloneDeep(nextBatch), this.actionHistory);
  }

  public tick(): MultiGameTickResult | undefined {
    // advance one frame if the local clock is playing
    if (this.mode !== MultiGameRunnerMode.Playing) return undefined;
    const result = this.tickOneFrame();
    this.emitState();
    return result;
  }

  public tickToFrame(frame: number): void {
    // advance until a target frame, consuming queued actions frame-by-frame
    this.assertPlayingOrPaused();
    while (this.mode === MultiGameRunnerMode.Playing && this.frame < frame) {
      this.tickOneFrame();
    }
    this.emitState();
  }

  protected tickOneFrame(): MultiGameTickResult {
    // collect frame-stamped actions, tick MultiGame once, and update mode
    const multiGame = this.getMultiGame();
    const nextFrame = this.frame + 1;
    const actionsByPlayer = this.drainActionsForFrame(nextFrame);
    const result = multiGame.tick(actionsByPlayer);
    const state = multiGame.getState();

    this.frame = state.frame;
    this.observers.forEach((observer) => observer.onTick?.(result));
    if (result.result) {
      this.mode = MultiGameRunnerMode.Ended;
      this.futureActions = [];
    }
    return result;
  }

  protected drainActionsForFrame(frame: number): MultiGameActions {
    // remove queued actions for this frame and group them by player
    const actionsByPlayer = this.getEmptyActionsByPlayer();
    const remainingActions: PlayerTimedActionBatch[] = [];
    for (let i = 0; i < this.futureActions.length; i++) {
      const batch = this.futureActions[i];
      if (batch.frame === frame) {
        actionsByPlayer[batch.player].push(...cloneDeep(batch.actions));
      } else {
        remainingActions.push(batch);
      }
    }
    this.futureActions = remainingActions;
    return actionsByPlayer;
  }

  protected getEmptyActionsByPlayer(): MultiGameActions {
    // create one mutable action list per player for the next tick
    const actionsByPlayer = new Array<GameAction[]>(this.players);
    for (let player = 0; player < this.players; player++) {
      actionsByPlayer[player] = [];
    }
    return actionsByPlayer;
  }

  protected insertActionBatch(batch: PlayerTimedActionBatch, batches: PlayerTimedActionBatch[]): void {
    // keep action lists sorted so future replay can be deterministic
    const insertIndex = batches.findIndex((item) => item.frame > batch.frame);
    if (insertIndex === -1) {
      batches.push(batch);
    } else {
      batches.splice(insertIndex, 0, batch);
    }
  }

  protected getMultiGame(): MultiGame {
    // return the live multigame or fail loudly if start() has not run
    if (!this.multiGame) {
      throw new Error("MultiGameRunner has not started");
    }
    return this.multiGame;
  }

  protected emitState(): void {
    // publish a fresh public state snapshot
    const state = this.getState();
    this.observers.forEach((observer) => observer.onState?.(state));
  }

  protected assertSetup(): void {
    // setup-only operations must happen before start()
    if (this.mode !== MultiGameRunnerMode.Setup) {
      throw new Error(`expected setup mode, got ${this.mode}`);
    }
  }

  protected assertPlayingOrPaused(): void {
    // action queues can be edited while playing or paused
    if (this.mode !== MultiGameRunnerMode.Playing && this.mode !== MultiGameRunnerMode.Paused) {
      throw new Error(`expected active game mode, got ${this.mode}`);
    }
  }

  protected assertValidPlayer(player: number): void {
    // player indices are zero-based and fixed for the lifetime of the runner
    if (player < 0 || player >= this.players) {
      throw new Error(`invalid player index ${player}`);
    }
  }
}
