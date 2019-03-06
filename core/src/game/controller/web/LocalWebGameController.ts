import { GameControllerMode, GameTickResultType, TimedGameTickResult } from "../../types";

import { GameControllerWithHistory, GameControllerWithHistoryOptions } from "../GameControllerWithHistory";


export class LocalWebGameController extends GameControllerWithHistory {
  protected refTime: number;
  protected refFrame: number;
  constructor(options: GameControllerWithHistoryOptions) {
    super(options);
    this.refFrame = 0;
    this.refTime = timestamp();
  }
  public run() {
    // called when gameplay starts, to initialize the game loop
    // this.last = timestamp();

    this.refFrame = 0;
    this.refTime = timestamp();
    // todo update refFrame/refTime when the game is paused

    requestAnimationFrame(this.tick.bind(this));
  }

  public tick(): TimedGameTickResult[] {
    // called once per frame
    if (!this.fsm.is(GameControllerMode.Playing)) {
      return [];
    }
    const now = timestamp();
    const { refFrame, refTime } = this;

    // calculate the expected game frame we should be at now,
    // and tick the game until it matches the expected frame
    // this allows the number of ticks to stay consistent over time
    // even if FPS changes or lags due to performance
    const frame = this.game.frame;
    const expectedFrame = Math.floor((now - refTime) / (1000 / 60)) + refFrame;
    const frameDiff = expectedFrame - frame;
    if(frameDiff > 60) throw new Error("GameController ticks got out of sync");

    if(Math.abs(frameDiff) > 1) {
      console.log('frame off by',  expectedFrame - frame);
    }

    let tickResults: TimedGameTickResult[] = [];

    for(let i = 0; i < frameDiff; i++) {
      const result = this.tickGame();
      if(result) {
        tickResults.push([this.game.frame, result]);
        if(result.type === GameTickResultType.Win) {
          this.fsm.go(GameControllerMode.Won);
          break;
        } else if(result.type === GameTickResultType.Lose) {
          this.fsm.go(GameControllerMode.Lost);
          break;
        }
      }
    }

    // render with the current game state
    // this.options.render(this.getState(), this.dt / slow);
    this.options.render(this.getState());
    // this.last = now;
    requestAnimationFrame(this.tick.bind(this));

    return tickResults;
  }
}

function timestamp(): number {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}
