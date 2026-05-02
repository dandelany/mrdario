import { GameActionType } from "../types/gameAction.js";
import { GameInput, InputEventType } from "../types/index.js";
import { isMoveInput } from "../utils/index.js";
import { InputManager } from "../input/types.js";
import { GameRunner } from "./GameRunner.js";
import {
  ActionSink,
  ActionSource,
  Cleanup,
  GameRunnerObserver,
  GameSession,
  TimedActionBatch,
  TimedActionSource
} from "./types.js";

export class ManualActionSource implements ActionSource {
  protected subscribers = new Set<(batch: TimedActionBatch) => void>();

  public subscribe(publish: (batch: TimedActionBatch) => void): Cleanup {
    this.subscribers.add(publish);
    return () => this.subscribers.delete(publish);
  }

  public publish(batch: TimedActionBatch): void {
    this.subscribers.forEach(subscriber => subscriber(batch));
  }
}

// bridge from existing input managers into frame-stamped game actions
export class InputManagerActionSource implements ActionSource {
  constructor(
    protected readonly inputManagers: InputManager[],
    protected readonly getFrame: () => number
  ) {}

  public subscribe(publish: (batch: TimedActionBatch) => void): Cleanup {
    this.inputManagers.forEach(inputManager => {
      inputManager.on("input", (input: GameInput, eventType: InputEventType) => {
        if (!isMoveInput(input)) return;

        publish({
          frame: this.getFrame() + 1,
          source: TimedActionSource.External,
          actions: [
            {
              type: GameActionType.Move,
              input,
              eventType
            }
          ]
        });
      });
    });

    return () => this.inputManagers.forEach(inputManager => inputManager.removeAllListeners());
  }
}

export class LocalRunnerSession implements GameSession {
  protected cleanupActions: Cleanup[] = [];
  protected timer: number | undefined;

  constructor(
    protected readonly runner: GameRunner,
    protected readonly actionSources: ActionSource[] = [],
    protected readonly observer: GameRunnerObserver = {},
    protected readonly frameMs: number = 1000 / 60
  ) {}

  public start(): void {
    this.stop();
    // sources feed the runner; observer feeds ui or tests
    this.cleanupActions = [
      this.runner.observe(this.observer),
      ...this.actionSources.map(source => source.subscribe(batch => this.runner.addActions(batch)))
    ];
    this.timer = window.setInterval(() => this.runner.tick(), this.frameMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    this.cleanupActions.forEach(cleanup => cleanup());
    this.cleanupActions = [];
  }
}

export interface VerifiedSinglePlayerTransport extends ActionSink {
  startGame: () => Promise<{
    gameId: string;
    seed: string;
  }>;
  finishGame?: (gameId: string, finalState: ReturnType<GameRunner["getState"]>) => Promise<void>;
}

// client-side half of verified single-player: server gives seed, client streams actions
export class VerifiedSinglePlayerSession implements GameSession {
  protected localSession: LocalRunnerSession | undefined;
  protected gameId: string | undefined;

  constructor(
    protected readonly makeRunner: (seed: string) => GameRunner,
    protected readonly makeLocalActionSource: (runner: GameRunner) => ActionSource,
    protected readonly transport: VerifiedSinglePlayerTransport,
    protected readonly observer: GameRunnerObserver = {}
  ) {}

  public async start(): Promise<void> {
    const { gameId, seed } = await this.transport.startGame();
    const runner = this.makeRunner(seed);
    const localActions = this.makeLocalActionSource(runner);
    // one local action stream drives both local prediction and server verification
    const serverSink: ActionSource = {
      subscribe: publish => {
        return localActions.subscribe(batch => {
          publish(batch);
          void this.transport.publish(batch);
        });
      }
    };

    this.gameId = gameId;
    this.localSession = new LocalRunnerSession(runner, [serverSink], {
      ...this.observer,
      onResult: result => {
        this.observer.onResult?.(result);
        // TODO: finalize only when the result is terminal and the server API has a score/claim shape.
      }
    });
    this.localSession.start();
  }

  public stop(): void {
    this.localSession?.stop();
    this.localSession = undefined;
    this.gameId = undefined;
  }
}
