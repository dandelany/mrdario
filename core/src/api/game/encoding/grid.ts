import * as t from "io-ts";
import { isLeft } from "fp-ts/lib/Either";

import { PathReporter } from "io-ts/lib/PathReporter";
import { COLORS } from "../../../game/constants";
import { GameGrid, GameGridRow, GridObject, GridObjectType } from "../../../game/types";
import { hasColor } from "../../../game/utils";
import { EncodedGridObject, encodeGridObject, tGridObjectCodec } from "./gridObject";

export type EncodedGrid = string;

// todo convert to io-ts codec

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

export const tGameGridCodec = new t.Type<GameGrid, string, unknown>(
  "GameGrid",
  // todo custom guard?
  (a: unknown): a is GameGrid => t.array(t.array(t.unknown)).is(a),
  // decode grid
  (input: unknown, context) => {
    if (!t.string.is(input)) { return t.failure(input, context, "Encoded grid must be a string"); }
    const encoded = input.replace(/\s/g, "");
    // get grid size from header (string should start with `gHEIGHTxWIDTH:`)
    const headerEndIndex = encoded.indexOf(":");
    if (encoded[0] !== "g" || headerEndIndex < 4) {
      return t.failure(input, context, "Invalid encoded grid header (should start with eg. `g9x17:`)");
    }
    const headerValStr = encoded.slice(1, headerEndIndex);
    const headerNumStrs = headerValStr.split(",");
    if (headerNumStrs.length !== 2) {
      return t.failure(input, context, "Invalid encoded grid header: must contain grid size");
    }
    const rowCount = parseInt(headerNumStrs[0], 36);
    const colCount = parseInt(headerNumStrs[1], 36);
    if (!isFinite(rowCount) || !isFinite(colCount) || rowCount < 1 || colCount < 1) {
      return t.failure(input, context, "Invalid encoded grid header: invalid grid size");
    }

    const gridStr = encoded.slice(headerEndIndex + 1);
    if (gridStr.length !== rowCount * colCount) {
      return t.failure(input, context, "grid size does not match header");
    }

    const grid: GameGrid = [];
    let gridStrIndex = 0;
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const row: GameGridRow = [];
      for (let colIndex = 0; colIndex < colCount; colIndex++) {
        const gridObj = tGridObjectCodec.decode(gridStr[gridStrIndex]);

        if (isLeft(gridObj)) {
          return t.failure(input, context, `Invalid grid object: ${gridStr[gridStrIndex]}`);
        }
        row.push(gridObj.right);
        gridStrIndex += 1;
      }
      grid.push(row);
    }
    return t.success(grid);
  },
  (grid: GameGrid) => {
    return encodeGrid(grid);
  }
);

export function decodeGrid(encoded: string) {
  const decoded = tGameGridCodec.decode(encoded);
  if (isLeft(decoded)) { throw new Error(PathReporter.report(decoded).join("; ")); }
  return decoded.right;
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
