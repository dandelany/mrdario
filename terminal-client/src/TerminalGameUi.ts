import * as blessed from "blessed";
import chalk from "chalk";

import { GameColor, GameGridRow, GridObject } from "mrdario-core/lib/game/types";
import { GameControllerMode, GameControllerPublicState } from "mrdario-core/lib/game/controller/GameController2";
import { hasColor } from "mrdario-core/lib/game/utils/guards";

import { GRID_OBJECT_STRINGS } from "./constants";
import { GridObjectStringMap } from "./types";


export default class TerminalGameUi {
  public screen: blessed.Widgets.Screen;
  private gameBox: blessed.Widgets.BoxElement;
  private scoreBox: blessed.Widgets.BoxElement;
  private lastGridStr: string;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true
    });

    this.gameBox = blessed.box({
      top: 'center',
      left: '50%-24',
      width: 24,
      height: 20,
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: '#f0f0f0'
        }
      }
    });
    this.scoreBox = blessed.box({
      top: 'center',
      left: '50%',
      width: 10,
      height: 4,
      content: 'Score',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: '#f0f0f0'
        }
      }
    });

    // Append our box to the screen.
    this.screen.append(this.gameBox);
    this.screen.append(this.scoreBox);

    // Quit on Escape, q, or Control-C.
    this.screen.key(['escape', 'q', 'C-c'], function(_ch, _key) {
      return process.exit(0);
    });

    // Focus our element.
    this.gameBox.focus();

    this.lastGridStr = "";

    // Render the screen.
    this.render();
  }
  render() {
    this.screen.render();
  }
  renderGame(state: GameControllerPublicState) {
    if(state.mode === GameControllerMode.Playing) {
      const gameState = state.gameStates[0];
      const gridRowStrs = gameState.grid.map((row: GameGridRow) => {
        const objStrs = row.map((obj: GridObject) => {
          return renderObject(obj, GRID_OBJECT_STRINGS);
        });
        return objStrs.join("");
      });
      const gridStr = gridRowStrs.join("\n");
      if (gridStr !== this.lastGridStr) {
        this.lastGridStr = gridStr;
        this.gameBox.setContent(gridStr);
        this.scoreBox.setContent(`Score\n${gameState.score}`);
        this.screen.render();
      }
    }

  }
}

function renderObject(obj: GridObject, objStrings: GridObjectStringMap): string {
  let objStr = hasColor(obj)
    ? renderWithColor(objStrings[obj.type], obj.color)
    : objStrings[obj.type];

  return objStr;
}

function renderWithColor(str: string, color: GameColor): string {
  if (color === GameColor.Color1) {
    return chalk.redBright(str);
  } else if (color === GameColor.Color2) {
    return chalk.yellowBright(str);
  }
  return chalk.blueBright(str);
}



