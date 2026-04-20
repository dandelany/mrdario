import {
  GameControllerMode,
  GameControllerState,
  KeyBindings,
} from "mrdario-core/game/types";

import { GridObjectStringMap } from "./types.js";
import { GRID_OBJECT_STRINGS, KEY_BINDINGS } from "./constants.js";
import TerminalGameUi from "./TerminalGameUi.js";
import TerminalKeyManager from "./TerminalKeyManager.js";
import CLIGameController from "./CLIGameController.js";

export interface CLIGameClientOptions {
  gridObjectStrings: GridObjectStringMap;
  keyBindings: KeyBindings;
}
export const defaultCLIGameClientOptions: CLIGameClientOptions = {
  gridObjectStrings: GRID_OBJECT_STRINGS,
  keyBindings: KEY_BINDINGS
};

export class CLIGameClient {
  ui: TerminalGameUi;
  options: CLIGameClientOptions;
  // gameController: TerminalGameController;
  gameController: CLIGameController;
  lastGridStr: string;
  keyManager: TerminalKeyManager;

  constructor(options: Partial<CLIGameClientOptions> = {}) {
    this.options = {
      ...defaultCLIGameClientOptions,
      ...options
    };
    this.lastGridStr = "";

    this.ui = new TerminalGameUi();

    this.keyManager = new TerminalKeyManager(GameControllerMode.Playing, KEY_BINDINGS, this.ui.screen);

    // this.gameController = new TerminalGameController({
    //   inputManagers: [this.keyManager],
    //   onChangeMode: (_fromMode: GameControllerMode, toMode: GameControllerMode) => {
    //     if (toMode === GameControllerMode.Won) {
    //       console.log("YOU WIN :)");
    //       process.exit();
    //     } else if (toMode === GameControllerMode.Lost) {
    //       console.log("YOU LOSE :(");
    //       process.exit();
    //     }
    //   },
    //   render: (state: GameControllerState) => {
    //     this.ui.renderGame(state);
    //   }
    // });

    // this.gameController.play();

    this.gameController = new CLIGameController({
      screen: this.ui.screen,
      render: (state: GameControllerState) => {
        this.ui.renderGame(state);
      },
      onWin: () => {
        this.ui.renderWin();
        setTimeout(this.cleanExit, 3000);
      },
      onLose: () => {
        this.ui.renderLose();
        setTimeout(this.cleanExit, 3000);
      },
      keyManager: this.keyManager
    });
  }
  cleanExit = () => {
    this.ui.screen.destroy();
    console.clear();
    process.exit(0)
  }
}

new CLIGameClient();
