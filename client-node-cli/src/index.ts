import * as logUpdate from "log-update";
import chalk from "chalk";
import Game from "mrdario-core/src/Game";
import {
  GameColor,
  GameGridRow,
  GameInput,
  GameInputMove,
  GridObject,
  GridObjectType,
  InputEventType
} from "mrdario-core/lib/types";
import { hasColor } from "mrdario-core/lib/utils/guards";
import keypress = require("keypress");

keypress(process.stdin);

const gridObjStrings: {[T in GridObjectType]: string} = {
  [GridObjectType.Empty]: '░░',
  // [GridObjectType.Empty]: '  ',
  [GridObjectType.Virus]: ':(',
  [GridObjectType.PillSegment]: '▒▒',
  [GridObjectType.PillBottom]: '▒▒',
  [GridObjectType.PillTop]: '▒▒',
  [GridObjectType.PillLeft]: '▒▒',
  [GridObjectType.PillRight]: '▒▒',
  [GridObjectType.Destroyed]: '**',
};

const keyBindings = {
  left: GameInput.Left,
  right: GameInput.Right,
  up: GameInput.Up,
  down: GameInput.Down,
  a: GameInput.RotateCCW,
  s: GameInput.RotateCW
};

function renderWithColor(str: string, color: GameColor): string {
  if(color === GameColor.Color1) {
    return chalk.red(str);
  } else if(color === GameColor.Color2) {
    return chalk.yellowBright(str);
  }
  return chalk.blueBright(str);
}

function renderObject(obj: GridObject): string {
  if(hasColor(obj)) {
    return renderWithColor(gridObjStrings[obj.type], obj.color);
  }
  return gridObjStrings[obj.type];
}

function enqueueInputEvents(queue: MoveInputEvent[], input: GameInputMove) {
  queue.push({input, eventType: InputEventType.KeyDown});
  queue.push({input, eventType: InputEventType.KeyUp});
}


interface MoveInputEvent {
  input: GameInputMove;
  eventType: InputEventType;
}

class CLIGameController {
  private game: Game;
  private debugStr: string;
  private moveInputQueue: MoveInputEvent[];
  private lastGridStr = '';

  constructor() {
    this.game = new Game();
    this.debugStr = 'debug';
    this.moveInputQueue = [];

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
  private bindKeyEvents() {
    process.stdin.on('keypress', (_ch, key) => {
      this.debugStr = "key " + key.name;

      if(key.name == 'p') {
        if(process.stdin.setRawMode) {
          process.stdin.setRawMode(false);
        }
      }

      if(key.name in keyBindings) {
        enqueueInputEvents(this.moveInputQueue, keyBindings[key.name]);
      }

    });
    if(process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
  }

  render() {
    const gridRowStrs = this.game.grid.map((row: GameGridRow<number>) => {
      const objStrs = row.map((obj: GridObject) => {
        return renderObject(obj);
      });
      return objStrs.join('');
    });
    const gridStr = gridRowStrs.concat(this.debugStr).join('\n');
    if(gridStr !== this.lastGridStr) {
      logUpdate(gridStr);
      this.lastGridStr = gridStr;
    }
  }
}

// const gameController = new CLIGameController();
new CLIGameController();


