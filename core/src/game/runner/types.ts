import { Game } from "../Game.js";
import { GameAction, TimedGameActions } from "../types/gameAction.js";
import { GameOptions, GameState, GameTickResult, TimedGameTickResult } from "../types/types.js";

export type Cleanup = () => void;

export enum TimedActionSource {
  External = "External",
  Derived = "Derived"
}

// actions that should be applied together on one game frame
export interface TimedActionBatch {
  frame: number;
  actions: GameAction[];
  // external actions come from players/server; derived actions come from game results
  source?: TimedActionSource;
}

// saved restore point used for rewind/replay
export interface GameRunnerSnapshot {
  frame: number;
  state: GameState;
}

// public runner state; callers should treat this as read-only
export interface GameRunnerState {
  frame: number;
  gameState: GameState;
  results: TimedGameTickResult[];
}

export interface GameRunnerOptions {
  gameOptions?: Partial<GameOptions>;
  gameFactory?: GameFactory;
  snapshotInterval?: number;
}

export type GameFactory = (options: Partial<GameOptions>) => Game;

export interface GameRunnerObserver {
  onState?: (state: GameRunnerState) => void;
  onResult?: (result: TimedGameTickResult) => void;
}

// anything that can produce timed actions: keyboard, network, replay log, etc.
export interface ActionSource {
  subscribe: (publish: (batch: TimedActionBatch) => void) => Cleanup;
}

// anything that consumes local actions: server stream, replay recorder, analytics, etc.
export interface ActionSink {
  publish: (batch: TimedActionBatch) => void | Promise<void>;
}

// small lifecycle wrapper around a runner plus its sources/sinks
export interface GameSession {
  start: () => void | Promise<void>;
  stop: () => void;
}

export function toTimedGameActions(batch: TimedActionBatch): TimedGameActions {
  return [batch.frame, batch.actions];
}

export function fromTimedGameActions(timedActions: TimedGameActions): TimedActionBatch {
  return {
    frame: timedActions[0],
    actions: timedActions[1]
  };
}

export function makeTimedResult(frame: number, result: GameTickResult): TimedGameTickResult {
  return [frame, result];
}
