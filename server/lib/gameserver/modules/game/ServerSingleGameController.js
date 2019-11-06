"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mrdario_core_1 = require("mrdario-core");
class ServerSingleGameController extends mrdario_core_1.GameController {
    constructor() {
        // simpler game controller which allows the client to control timing
        // tick ahead to frame manually when events are received rather than controlling ticks/time
        super(...arguments);
        this.onCountdown = () => {
            console.log('onCountdown');
        };
    }
    setState(state) {
        // reset state machine mode
        delete this.fsm;
        this.fsm = this.initStateMachine(state.mode);
        // set game state
        this.game.setState(state.gameState);
        // todo generalize to handle timers/ticks/history
    }
    tick() {
        return this.tickToFrame(this.game.frame + 1);
    }
    run() {
        // called when gameplay starts, to initialize the game loop
        // this.last = timestamp();
        this.refFrame = 0;
        this.refTime = this.getTime();
    }
}
exports.ServerSingleGameController = ServerSingleGameController;
//# sourceMappingURL=ServerSingleGameController.js.map