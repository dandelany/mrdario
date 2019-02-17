import { GameControllerMode } from "../../types";
// import { AbstractGameController } from "../AbstractGameController";
import { GameControllerWithHistory } from "../GameControllerWithHistory";

// export class LocalWebGameController extends AbstractGameController {
export class LocalWebGameController extends GameControllerWithHistory {
  public run() {
    // called when gameplay starts, to initialize the game loop
    this.dt = 0;
    this.last = timestamp();
    requestAnimationFrame(this.tick.bind(this));
  }

  public tick() {
    // called once per frame
    if (!this.fsm.is(GameControllerMode.Playing)) {
      return;
    }
    const now = timestamp();
    const { slow } = this.options;
    const { dt, last, slowStep } = this;

    // allows the number of ticks to stay consistent
    // even if FPS changes or lags due to performance
    this.dt = dt + Math.min(1, (now - last) / 1000);
    while (this.dt > slowStep) {
      this.dt = this.dt - slowStep;
      this.tickGame();
    }

    // render with the current game state
    this.options.render(this.getState(), this.dt / slow);
    this.last = now;
    requestAnimationFrame(this.tick.bind(this));
  }
}

function timestamp(): number {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}
