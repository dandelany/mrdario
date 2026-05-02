import { Game } from "../Game.js";
import { GameAction } from "../types/gameAction.js";
import { GameOptions, GameTickResult } from "../types/types.js";
import lodash from "lodash";
import {
  GameFactory,
  GameRunnerObserver,
  GameRunnerOptions,
  GameRunnerSnapshot,
  GameRunnerState,
  TimedActionSource,
  TimedActionBatch,
  makeTimedResult
} from "./types.js";

const DEFAULT_SNAPSHOT_INTERVAL = 30;
const { cloneDeep } = lodash;

function cloneActions(actions: GameAction[]): GameAction[] {
  return cloneDeep(actions);
}

// deterministic shell around Game: owns frame history, snapshots, and late-action replay
export class GameRunner {
  protected readonly gameFactory: GameFactory;
  protected readonly snapshotInterval: number;
  protected readonly actionHistory: TimedActionBatch[] = [];
  protected readonly snapshots: GameRunnerSnapshot[] = [];
  protected readonly results: GameRunnerState["results"] = [];
  protected readonly observers = new Set<GameRunnerObserver>();
  protected game: Game;

  constructor(options: GameRunnerOptions = {}) {
    this.gameFactory = options.gameFactory || ((gameOptions: Partial<GameOptions> = {}) => new Game(gameOptions));
    this.snapshotInterval = options.snapshotInterval || DEFAULT_SNAPSHOT_INTERVAL;
    this.game = this.gameFactory(options.gameOptions || {});
    this.saveSnapshot();
  }

  public observe(observer: GameRunnerObserver): () => void {
    this.observers.add(observer);
    observer.onState?.(this.getState());
    return () => this.observers.delete(observer);
  }

  public get frame(): number {
    return this.game.frame;
  }

  public getState(): GameRunnerState {
    return {
      frame: this.game.frame,
      gameState: cloneDeep(this.game.getState()),
      results: cloneDeep(this.results)
    };
  }

  public tick(actions: GameAction[] = []): GameTickResult | undefined {
    const nextFrame = this.game.frame + 1;
    const recordedActions = this.getActionsForFrame(nextFrame);
    const allActions = actions.length > 0 ? [...recordedActions, ...actions] : recordedActions;

    // direct actions are recorded here; queued future actions were recorded by addActions()
    return this.tickAtFrame(nextFrame, allActions, actions.length > 0);
  }

  public addActions(batch: TimedActionBatch): void {
    // late actions may change already-rendered history, so rewind before continuing
    if (batch.frame <= this.game.frame) {
      this.queueActions(batch);
      this.rewriteHistoryFromFrame(batch.frame);
      return;
    }

    this.queueActions(batch);
  }

  public queueActions(batch: TimedActionBatch): void {
    this.insertActions(batch);
  }

  public rewriteHistoryFromFrame(frame: number): void {
    const currentFrame = this.game.frame;
    this.rewindToBeforeFrame(frame);
    this.tickToFrame(currentFrame);
    this.emitState();
  }

  public tickToFrame(frame: number): void {
    // catch-up/replay helper: advance through every missing frame until `frame`
    // this consumes actions already stored in history for each frame
    while (this.game.frame < frame) {
      const nextFrame = this.game.frame + 1;
      const actions = this.getActionsForFrame(nextFrame);
      this.tickAtFrame(nextFrame, actions, false);
    }
  }

  // single-frame primitive: apply actions to exactly the next frame and emit results/state
  // `recordActions=false` is for replay, where the actions already exist in history
  protected tickAtFrame(frame: number, actions: GameAction[] = [], recordActions: boolean = true): GameTickResult | undefined {
    if (frame !== this.game.frame + 1) {
      throw new Error(`GameRunner can only tick the next frame. expected ${this.game.frame + 1}, got ${frame}`);
    }

    // replay passes already-recorded actions back through here; do not duplicate them
    if (recordActions && actions.length > 0) {
      this.insertActions({ frame, actions });
    }

    const result = this.game.tick(actions) || undefined;
    if (result) {
      const timedResult = makeTimedResult(this.game.frame, result);
      this.results.push(timedResult);
      this.observers.forEach(observer => observer.onResult?.(timedResult));
    }

    if (this.game.frame % this.snapshotInterval === 0) {
      this.saveSnapshot();
    }

    this.emitState();
    return result;
  }

  public rewindToBeforeFrame(frame: number): GameRunnerSnapshot {
    const snapshot = this.findSnapshotBeforeFrame(frame);
    this.restoreSnapshot(snapshot);
    this.dropFutureDerivedData(snapshot.frame, frame);
    return snapshot;
  }

  protected insertActions(batch: TimedActionBatch): void {
    if (batch.actions.length === 0) return;

    const existing = this.actionHistory.find(item => item.frame === batch.frame && item.source === batch.source);
    if (existing) {
      existing.actions.push(...cloneActions(batch.actions));
      return;
    }

    const insertIndex = this.actionHistory.findIndex(item => item.frame > batch.frame);
    const nextBatch = {
      frame: batch.frame,
      actions: cloneActions(batch.actions),
      source: batch.source
    };

    if (insertIndex === -1) this.actionHistory.push(nextBatch);
    else this.actionHistory.splice(insertIndex, 0, nextBatch);
  }

  protected getActionsForFrame(frame: number): GameAction[] {
    return this.actionHistory
      .filter(item => item.frame === frame)
      .flatMap(item => item.actions);
  }

  protected saveSnapshot(): void {
    // GameState contains mutable grids, so snapshots must not share object identity
    const snapshot = {
      frame: this.game.frame,
      state: cloneDeep(this.game.getState())
    };

    const existingIndex = this.snapshots.findIndex(item => item.frame === snapshot.frame);
    if (existingIndex === -1) this.snapshots.push(snapshot);
    else this.snapshots[existingIndex] = snapshot;
  }

  protected findSnapshotBeforeFrame(frame: number): GameRunnerSnapshot {
    for (let i = this.snapshots.length - 1; i >= 0; i -= 1) {
      if (this.snapshots[i].frame < frame) return this.snapshots[i];
    }

    return this.snapshots[0];
  }

  protected restoreSnapshot(snapshot: GameRunnerSnapshot): void {
    this.game.setState(cloneDeep(snapshot.state));
  }

  protected dropFutureDerivedData(snapshotFrame: number, actionFrame: number): void {
    // snapshots/results after the rewind point are recomputed
    for (let i = this.snapshots.length - 1; i >= 0; i -= 1) {
      if (this.snapshots[i].frame > snapshotFrame) this.snapshots.splice(i, 1);
    }

    for (let i = this.results.length - 1; i >= 0; i -= 1) {
      if (this.results[i][0] > snapshotFrame) this.results.splice(i, 1);
    }

    // derived actions after the changed external input may no longer be valid
    for (let i = this.actionHistory.length - 1; i >= 0; i -= 1) {
      const batch = this.actionHistory[i];
      if (batch.frame >= actionFrame && batch.source === TimedActionSource.Derived) {
        this.actionHistory.splice(i, 1);
      }
    }
  }

  protected emitState(): void {
    const state = this.getState();
    this.observers.forEach(observer => observer.onState?.(state));
  }
}
