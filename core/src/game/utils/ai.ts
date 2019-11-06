import { unzip } from "lodash";
import { GameColor, GameState, GridObjectType } from "../types";
import { hasColor } from "./guards";

const VIRUS_SCORE = -1000;
const NEW_COL_RUN_SCORE = -150;
const COL_RUN_OBJ_SCORE = 50;
const COL_RUN_EMPTY_SCORE = 10;
const COL_RUN_DESTROYED_SCORE = 200;

export function scoreGameState(state: GameState) {
  const { grid } = state;

  // -1000 points for each virus
  // scan for strings of colors + empties
  let score: number = 0;
  const colScores: number[] = [];

  const colGrid = unzip(grid);
  for (let i = 0; i < colGrid.length; i++) {
    const column = colGrid[i];
    console.log(column);
    let curColScore = 0;
    let curColRunColor: GameColor | undefined;

    for (let j = 0; j < column.length; j++) {
      const gridObj = column[j];
      if (hasColor(gridObj)) {
        const {color, type} = gridObj;
        if (type === GridObjectType.Virus) { curColScore += VIRUS_SCORE; }
        // if(curColRunColor === undefined) curColRunColor = gridObj.color;

        if (color === curColRunColor) { curColScore += COL_RUN_OBJ_SCORE; }
        else {
          curColScore += NEW_COL_RUN_SCORE;
          curColRunColor = color;
        }
      }
      else if (gridObj.type === GridObjectType.Empty && curColRunColor !== undefined) {
        curColScore += COL_RUN_EMPTY_SCORE;
 }
      else if (gridObj.type === GridObjectType.Destroyed) {
        curColScore += COL_RUN_DESTROYED_SCORE;
 }
    }
    colScores[i] = curColScore;
    score += curColScore;
  }

  console.log('colScores', colScores);
  console.log('score', score);
  // for (let i = 0; i < grid.length; i++) {
  //   const row = grid[i];
  //   for (let j = 0; j < row.length; j++) {
  //     const gridObj = row[j];
  //     if(hasColor(gridObj)) {
  //
  //     }
  //   }
  // }
}
