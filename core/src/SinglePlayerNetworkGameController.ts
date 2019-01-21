import SinglePlayerGameController, { GameControllerOptions } from "./browser/SingleGameController";

// WIP for sending moves to server...

export default class SinglePlayerNetworkGameController extends SinglePlayerGameController {
  constructor(options: GameControllerOptions) {
    super(options);
    // this.socket = options.socket;
  }
  public tickGame() {
    // if there are pending moves, send them via socket
    // if(this.moveInputQueue.length) this.socket.emit('moves', this.moveInputQueue);
    // tick the game, sending current queue of moves
    super.tickGame();
  }
}
