import * as blessed from "blessed";

import { Game, GameActionType } from "mrdario-core/lib/Game";
import {
  GameControllerMode,
  GameControllerState,
  GameInput,
  GameInputMove,
  InputEventType,
  MoveInputEvent
} from "mrdario-core/lib/game/types";

import TerminalKeyManager from "./TerminalKeyManager";

interface CLIGameControllerOptions {
  screen: blessed.Widgets.Screen;
  render: (state: GameControllerState) => any;
  onWin: () => any;
  onLose: () => any;
  keyManager: TerminalKeyManager;
}

export default class CLIGameController {
  private game: Game;
  private moveInputQueue: MoveInputEvent[];
  // private lastGridStr = '';
  // private keyManager: TerminalKeyManager;
  public options: CLIGameControllerOptions;

  constructor(options: CLIGameControllerOptions) {
    this.options = options;
    this.game = new Game({
      // onLose: options.onLose,
      // onWin: options.onWin,
      level: 12
    });
    this.moveInputQueue = [];

    // this.keyManager = new TerminalKeyManager(GameControllerMode.Playing, KEY_BINDINGS, options.screen);
    this.bindKeyEvents();
    this.render();

    setInterval(() => {
      this.tick();
    }, Math.ceil(1000 / 60));
  }

  tick() {
    this.game.tick(this.moveInputQueue.map(({input, eventType}) => {
      return {type: GameActionType.Move, input, eventType}
    }));
    this.render();
    this.moveInputQueue = [];
  }
  private enqueueInputEvents(input: GameInputMove, eventType: InputEventType) {
    this.moveInputQueue.push({ input, eventType });
  }
  private bindKeyEvents() {
    const moveInputs: GameInputMove[] = [
      GameInput.Left,
      GameInput.Right,
      GameInput.Down,
      GameInput.Up,
      GameInput.RotateCCW,
      GameInput.RotateCW
    ];
    moveInputs.forEach((input: GameInputMove) => {
      const boundEnqueueInput: (eventType: InputEventType) => void = this.enqueueInputEvents.bind(
        this,
        input
      );
      this.options.keyManager.on(input, boundEnqueueInput);
    });
  }

  public getState(mode?: GameControllerMode): GameControllerState {
    // minimal description of game state to render
    // return this.game.getState();
    return {
      mode: mode || GameControllerMode.Playing,
      gameState: this.game.getState()
    //   pillCount: this.game.pillCount,
    //   grid: this.game.grid,
    //   pillSequence: this.game.pillSequence,
    //   score: this.game.score,
    //   timeBonus: this.game.timeBonus
    };
  }

  render() {
    this.options.render(this.getState());
  }
}
