import invariant from "invariant";

import { COLORS } from "../../game/constants";
import { GameGrid, GameGridRow, GridObject, GridObjectType } from "../../game/types";
import { hasColor } from "../../game/utils";
import { EncodedGridObject, encodeGridObject, tGridObjectCodec } from "./gridObject";

export type EncodedGrid = string;

export function encodeGrid(grid: GameGrid, prettyPrint: boolean = false): EncodedGrid {
  const rowCount = grid.length;
  const colCount = grid[0].length;
  const encodedRowCount = rowCount.toString(36);
  const encodedColCount = colCount.toString(36);
  let encoded = `g${encodedRowCount},${encodedColCount}:${prettyPrint ? "\n" : ""}`;
  for (const row of grid) {
    for (const gridObj of row) {
      encoded += encodeGridObject(gridObj);
    }
    if (prettyPrint) {
      encoded += "\n";
    }
  }
  return encoded;
}

export function decodeGrid(encodedRaw: EncodedGrid): GameGrid {
  // const invalidGridMessage = "Invalid encoded grid: " + encoded;
  const encoded = encodedRaw.replace(/\s/g, "");
  // header looks like `g9x17:`
  const headerEndIndex = encoded.indexOf(":");
  if (encoded[0] !== "g" || headerEndIndex < 4) {
    throw new Error("invalidGridMessage");
  }
  const headerValStr = encoded.slice(1, headerEndIndex);
  const headerNumStrs = headerValStr.split(",");
  invariant(headerNumStrs.length === 2, "grid header must contain grid size");
  const rowCount = parseInt(headerNumStrs[0], 36);
  const colCount = parseInt(headerNumStrs[1], 36);
  invariant(isFinite(rowCount) && isFinite(colCount), "invalid grid size");

  const gridStr = encoded.slice(headerEndIndex + 1);
  invariant(gridStr.length === rowCount * colCount, "grid size does not match header");

  const grid: GameGrid = [];
  let gridStrIndex = 0;
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row: GameGridRow = [];
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      // const gridObj = decodeGridObject(gridStr[gridStrIndex]);
      const gridObj = tGridObjectCodec.decode(gridStr[gridStrIndex]);
      if(gridObj.isLeft()) throw new Error("failed to decode grid object");
      row.push(gridObj.value);
      gridStrIndex += 1;
    }
    grid.push(row);
  }
  return grid;
}

// for debugging purposes -
// this func returns a string which describes the mapping between characters and all grid objects
// one per line eg.:
// O = PillTop Color1
// W = PillTop Color2
// ...etc...
export function getGridEncodingDictionary() {
  const dict: string[] = [];
  Object.keys(GridObjectType).map((gridObjTypeValue: string) => {
    const obj = { type: gridObjTypeValue } as GridObject;
    if (gridObjTypeValue === GridObjectType.Empty || gridObjTypeValue === GridObjectType.Destroyed) {
      dict.push(makeGridDictLine(obj));
    } else {
      COLORS.forEach(color => {
        const colorObj = { color, ...obj };
        dict.push(makeGridDictLine(colorObj));
      });
    }
  });
  // console.log(dict.join("\n"))
  return dict.join("\n");
}
function makeGridDictLine(gridObj: GridObject): EncodedGridObject {
  const colors = ["Color1", "Color2", "Color3"];
  const colorStr = hasColor(gridObj) ? colors[gridObj.color] : "";
  return `${encodeGridObject(gridObj)} = ${gridObj.type} ${hasColor(gridObj) ? colorStr : ""}`;
}
