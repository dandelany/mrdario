import { GameController, GameControllerState } from "mrdario-core/game/controller";
import lodash from "lodash";
import { TimedGameTickResult } from "mrdario-core/game/types";

const { cloneDeep } = lodash;

export class ServerSingleGameController extends GameController {
  // simpler game controller which allows the client to control timing
  // tick ahead to frame manually when events are received rather than controlling ticks/time

  public setState(state: GameControllerState) {
    // reset state machine mode
    this.fsm = this.initStateMachine(state.mode);
    // set game state
    this.game.setState(state.gameState);
    // reset timing/history so old actions from the previous timeline don't poison the new one
    this.futureActions = [];
    this.actionHistory = [];
    this.stateHistory = [cloneDeep(this.game.getState())];
    this.refFrame = this.game.frame;
    this.refTime = this.getTime();
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
