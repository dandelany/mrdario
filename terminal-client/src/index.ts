import { create as createSocket, SCClientSocket } from "socketcluster-client";
import { defaults } from "lodash";
// import Game from "mrdario-core/src/Game";
import { GameControllerActionType, KeyBindings } from "mrdario-core/lib/game/types";
import { GameController, GameControllerMode } from "mrdario-core/lib/game/controller/GameController2";

import { GridObjectStringMap } from "./types";
import { GRID_OBJECT_STRINGS, KEY_BINDINGS } from "./constants";
import TerminalGameUi from "./TerminalGameUi";
import TerminalKeyManager from "./TerminalKeyManager";
// import CLIGameController from "./CLIGameController";
// import TerminalGameController from "./TerminalGameController";


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
  // gameController: CLIGameController;
  gameController: GameController;
  lastGridStr: string;
  keyManager: TerminalKeyManager;

  constructor(options: Partial<CLIGameClientOptions> = {}) {
    this.options = defaults(options, defaultCLIGameClientOptions);
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

    // this.gameController = new CLIGameController({
    //   screen: this.ui.screen,
    //   render: (state: GameControllerState) => {
    //     this.ui.renderGame(state);
    //   },
    //   onWin: () => {
    //     console.log("YOU WIN :)");
    //     process.exit();
    //   },
    //   onLose: () => {
    //     console.log("YOU LOSE :(");
    //     process.exit();
    //   },
    //   keyManager: this.keyManager
    // });

    this.gameController = new GameController({
      players: 1,
      render: (state) => {
        this.ui.renderGame(state);
      },
      // onLocalAction: action => {console.log(action)},
      inputManagers: [[this.keyManager]]
    })
    this.gameController.handleLocalAction({type: GameControllerActionType.Ready, player: 0, ready: true});







    let socket: SCClientSocket = createSocket({ port: 8000 });

    socket.on("error", (_err: Error) => {
      // this.debugStr = err.message
      // console.log(err);
    });

    socket.on("connect", () => {
      console.log("Socket connected - OK");
      // this.debugStr = "CONNECTED"

      // socket.emit('sampleClientEvent', 0);
    });
  }
}

new CLIGameClient();
