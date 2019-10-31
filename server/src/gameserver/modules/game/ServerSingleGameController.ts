import { GameController, GameControllerState, TimedGameTickResult } from "mrdario-core";

export class ServerSingleGameController extends GameController {
  // simpler game controller which allows the client to control timing
  // tick ahead to frame manually when events are received rather than controlling ticks/time

  public setState(state: GameControllerState) {
    // reset state machine mode
    delete this.fsm;
    this.fsm = this.initStateMachine(state.mode);
    // set game state
    this.game.setState(state.gameState);

    // todo generalize to handle timers/ticks/history
  }

  public tick(): TimedGameTickResult[] {
    return this.tickToFrame(this.game.frame + 1);
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
