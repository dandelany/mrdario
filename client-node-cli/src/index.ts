// import * as logUpdate from "log-update";
import chalk from "chalk";
import * as blessed from "blessed";
import { create as createSocket, SCClientSocket } from "socketcluster-client";
import { defaults } from "lodash";

import Game from "mrdario-core/src/Game";
import {
  GameColor,
  GameControllerMode,
  GameGridRow,
  GameInput,
  GameInputMove,
  GridObject,
  InputEventType,
  InputManager,
  KeyBindings,
  ModeKeyBindings
} from "mrdario-core/lib/types";
import { hasColor } from "mrdario-core/lib/utils/guards";

import { GridObjectStringMap } from "./types";
import { GRID_OBJECT_STRINGS, KEY_BINDINGS } from "./constants";
// import keypress = require("keypress");
import { Widgets } from "blessed";
import { EventEmitter } from "events";

interface MoveInputEvent {
  input: GameInputMove;
  eventType: InputEventType;
}



export interface CLIGameClientOptions {
  gridObjectStrings: GridObjectStringMap;
  keyBindings: KeyBindings;
}
export const defaultCLIGameClientOptions: CLIGameClientOptions = {
  gridObjectStrings: GRID_OBJECT_STRINGS,
  keyBindings: KEY_BINDINGS
};

export class CLIGameClient {
  options: CLIGameClientOptions;
  gameController: CLIGameController;
  lastGridStr: string;

  constructor(options: Partial<CLIGameClientOptions> = {}) {
    this.options = defaults(options, defaultCLIGameClientOptions);
    this.lastGridStr = '';

    var screen = blessed.screen({
      smartCSR: true
    });

    screen.title = 'my window title';

    var box = blessed.box({
      top: 'center',
      left: 'center',
      width: 24,
      height: 20,
      content: 'Hello {bold}world{/bold}!',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        // bg: 'magenta',
        border: {
          fg: '#f0f0f0'
        },
        hover: {
          bg: 'green'
        }
      }
    });

    // Append our box to the screen.
    screen.append(box);

    // Quit on Escape, q, or Control-C.
    screen.key(['escape', 'q', 'C-c'], function(_ch, _key) {
      return process.exit(0);
    });

    // Focus our element.
    box.focus();

    // Render the screen.
    screen.render();

    this.gameController = new CLIGameController({
      screen,
      onLose: () => {
        console.log("YOU LOSE :(");
        process.exit();
      },
      onWin: () => {
        console.log("YOU WIN :)");
        process.exit();
      },
      render: (game) => {
        const gridRowStrs = game.grid.map((row: GameGridRow<number>) => {
          const objStrs = row.map((obj: GridObject) => {
            return renderObject(obj, GRID_OBJECT_STRINGS);
          });
          return objStrs.join('');
        });
        const gridStr = gridRowStrs.join('\n');
        if(gridStr !== this.lastGridStr) {
          this.lastGridStr = gridStr;
          box.setContent(gridStr);
          screen.render();


        }


      }
    });


    let socket: SCClientSocket = createSocket({ port: 8000 });

    socket.on('error', (_err: Error) => {
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


function renderWithColor(str: string, color: GameColor): string {
  if(color === GameColor.Color1) {
    return chalk.redBright(str);
  } else if(color === GameColor.Color2) {
    return chalk.yellowBright(str);
  }
  return chalk.blueBright(str);
}

function renderObject(obj: GridObject, objStrings: GridObjectStringMap): string {
  let objStr = hasColor(obj) ?
    renderWithColor(objStrings[obj.type], obj.color) :
    objStrings[obj.type];

  return objStr;
}

// function enqueueInputEvents(queue: MoveInputEvent[], input: GameInputMove) {
//   queue.push({input, eventType: InputEventType.KeyDown});
//   queue.push({input, eventType: InputEventType.KeyUp});
// }


class CLIKeyManager extends EventEmitter implements InputManager{
  mode: GameControllerMode;
  keyBindings: KeyBindings;
  screen: blessed.Widgets.Screen;
  private keyListeners: object;

  constructor(initialMode: GameControllerMode, keyBindings: KeyBindings, screen: blessed.Widgets.Screen) {
    super();
    this.keyListeners = {};
    this.keyBindings = keyBindings;
    this.screen = screen;
    this.mode = initialMode;
    this.setMode(initialMode);
  }
  public setMode(mode: GameControllerMode) {
    if (this.mode) {
      this.unbindKeys();
    }
    this.bindModeKeys(mode);
    this.mode = mode;
  }
  private handleInput(inputType: GameInput) {
    super.emit(inputType, InputEventType.KeyDown);
    super.emit(inputType, InputEventType.KeyUp);
  }
  private bindModeKeys(mode: GameControllerMode) {
    if(!this.keyBindings[mode]) return;
    const modeBindings: ModeKeyBindings = this.keyBindings[mode] as ModeKeyBindings;
    for (const inputTypeStr of Object.keys(modeBindings)) {
      const inputType = inputTypeStr as GameInput;
      const keyStr = modeBindings[inputType] as string | string[];

      const listener = this.handleInput.bind(this, inputType);
      this.keyListeners[inputTypeStr] = {keyStr, listener};

      this.screen.key(keyStr, listener);
    }
  }
  private unbindKeys() {
    // todo
    for(const inputTypeStr of Object.keys(this.listeners)) {
      const {keyStr, listener} = this.keyListeners[inputTypeStr];
      this.screen.unkey(keyStr, listener);
    }
  }

}

interface CLIGameControllerOptions {
  screen: Widgets.Screen;
  render: (game: Game) => any;
  onWin: () => any;
  onLose: () => any;
}

class CLIGameController {
  private game: Game;
  private moveInputQueue: MoveInputEvent[];
  // private lastGridStr = '';
  private keyManager: CLIKeyManager;
  public options: CLIGameControllerOptions;

  constructor(options: CLIGameControllerOptions) {
    this.options = options;
    this.game = new Game({
      onLose: options.onLose,
      onWin: options.onWin
    });
    this.moveInputQueue = [];

    this.keyManager = new CLIKeyManager(GameControllerMode.Playing, KEY_BINDINGS, options.screen);
    this.bindKeyEvents();
    this.render();


    setInterval(() => {
      this.tick();
    }, Math.ceil(1000 / 60));
  }

  tick() {
    this.game.tick(this.moveInputQueue);
    this.render();
    this.moveInputQueue = [];
  }
  private enqueueInputEvents(input: GameInputMove, eventType: InputEventType) {
    this.moveInputQueue.push({input, eventType});
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
      const boundEnqueueInput: (
        eventType: InputEventType
      ) => void = this.enqueueInputEvents.bind(this, input);
      this.keyManager.on(input, boundEnqueueInput);
    });
  }

  render() {
    this.options.render(this.game);
    // const gridRowStrs = this.game.grid.map((row: GameGridRow<number>) => {
    //   const objStrs = row.map((obj: GridObject) => {
    //     return renderObject(obj, GRID_OBJECT_STRINGS);
    //   });
    //   return objStrs.join('');
    // });
    // const gridStr = gridRowStrs.concat(this.debugStr).join('\n');
    // if(gridStr !== this.lastGridStr) {
    //   // logUpdate(gridStr);
    //   this.lastGridStr = gridStr;
    // }
  }
}

// const gameController = new CLIGameController();
// new CLIGameController();
new CLIGameClient();

