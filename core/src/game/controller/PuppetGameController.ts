import { GameController } from "./GameController";
import { GameControllerState } from "./types";
import { TimedGameTickResult } from "../types";


export class PuppetGameController extends GameController {
  // simpler game controller which does not control timing
  // tick ahead to frame manually when events are received rather than controlling ticks/time
  // meant to reflect the state of some external game, rather than being the primary game-runner

  public setState(state: GameControllerState) {
    // reset state machine mode
    delete this.fsm;
    this.fsm = this.initStateMachine(state.mode);
    // set game state
    this.game.setState(state.gameState);

    // todo generalize to handle timers/ticks/history
  }

  public tick(): TimedGameTickResult[] {
    const results = this.tickToFrame(this.game.frame + 1);
    this.options.render(this.getState());
    return results;
  }

  public run() {
    // called when gameplay starts, to initialize the game loop
    // this.last = timestamp();
    this.refFrame = 0;
    this.refTime = this.getTime();
  }

  protected onCountdown = () => {
    console.log('onCountdown');
  }

}
