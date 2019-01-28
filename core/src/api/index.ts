import { invert } from "lodash";
import * as invariant from "invariant";

import {
  GameColor,
  GameGrid,
  GameGridRow,
  GameInput,
  GameInputMove,
  GridObject,
  GridObjectType,
  GridObjectWithFalling,
  InputEventType,
  MoveInputEvent, PillColors
} from "../types";
import { hasColor, hasFalling } from "../utils/guards";
import { GameState } from "../Game";
import { MovingCounters, MovingDirections } from "../InputRepeater";

// binary encodings for grid objects

export type EncodedGridObject = string;
export type EncodedGrid = string;
type GridObjectTypeBinaryEncodingMap = { [T in GridObjectType]: number };
type ColorBinaryEncodingMap = { [C in GameColor | ""]: number };
type booleanBinaryEncodingMap = { true: number; false: number };

export const gridObjectTypeEncodingMap: GridObjectTypeBinaryEncodingMap = {
  [GridObjectType.Destroyed]: 0b000,
  [GridObjectType.Empty]: 0b001,
  [GridObjectType.PillTop]: 0b010,
  [GridObjectType.PillBottom]: 0b011,
  [GridObjectType.PillLeft]: 0b100,
  [GridObjectType.PillRight]: 0b101,
  [GridObjectType.PillSegment]: 0b110,
  [GridObjectType.Virus]: 0b111
};
const binaryGridObjectTypeMap = invert(gridObjectTypeEncodingMap);

export const colorEncodingMap: ColorBinaryEncodingMap = {
  "": 0b00000,
  [GameColor.Color1]: 0b01000,
  [GameColor.Color2]: 0b10000,
  [GameColor.Color3]: 0b11000
};
const binaryColorMap = invert(colorEncodingMap);

export const isFallingEncodingMap: booleanBinaryEncodingMap = {
  true: 0b100000,
  false: 0b000000
};
const binaryIsFallingMap = invert(isFallingEncodingMap);

// binary encodings for move inputs
export type EncodedMoveInputEvent = string;
type MoveInputBinaryEncodingMap = { [I in GameInputMove]: number };
type InputEventTypeEncodingMap = { [T in InputEventType]: number };

export const moveInputEncodingMap: MoveInputBinaryEncodingMap = {
  [GameInput.Up]: 0b000,
  [GameInput.Down]: 0b001,
  [GameInput.Left]: 0b010,
  [GameInput.Right]: 0b011,
  [GameInput.RotateCW]: 0b100,
  [GameInput.RotateCCW]: 0b101
};
export const moveInputDecodingMap = invert(moveInputEncodingMap);

export const inputEventTypeEncodingMap: InputEventTypeEncodingMap = {
  [InputEventType.KeyDown]: 0b000000,
  [InputEventType.KeyUp]: 0b100000
};
export const inputEventTypeDecodingMap = invert(inputEventTypeEncodingMap);

export function encodeMoveInputEvent(event: MoveInputEvent): EncodedMoveInputEvent {
  const moveInputCode = moveInputEncodingMap[event.input];
  const eventTypeCode = inputEventTypeEncodingMap[event.eventType];
  // bitwise OR the codes together, then get ascii character
  // 0b1000000 makes output easier to read
  const encoded: number = 0b1001000 | eventTypeCode | moveInputCode;
  return String.fromCharCode(encoded);
}
export function decodeMoveInputEvent(encodedStr: EncodedMoveInputEvent): MoveInputEvent {
  const encoded: number = encodedStr.charCodeAt(0);
  const moveInputCode: number = encoded & 0b000111;
  const eventTypeCode: number = encoded & 0b100000;

  invariant(moveInputCode + "" in moveInputDecodingMap, "Invalid move code");
  const input: GameInputMove = moveInputDecodingMap[moveInputCode + ""] as GameInputMove;
  invariant(eventTypeCode + "" in inputEventTypeDecodingMap, "Invalid event type code");
  const eventType: InputEventType = inputEventTypeDecodingMap[eventTypeCode + ""] as InputEventType;

  return { input, eventType };
}

// encode/decode functions for grid & grid objects

export function encodeGrid(grid: GameGrid): EncodedGrid {
  const rowCount = grid.length;
  const colCount = grid[0].length;
  // use radix 35, not 36 because 35.toString(36) is 'z', which is delimiter
  const encodedRowCount = rowCount.toString(35);
  const encodedColCount = colCount.toString(35);
  let encoded = `g${encodedRowCount}z${encodedColCount}:`;
  for (let row of grid) {
    for (let gridObj of row) {
      encoded += encodeGridObject(gridObj);
    }
  }
  return encoded;
}

export function encodeGridObject(obj: GridObject): EncodedGridObject {
  const typeCode: number = gridObjectTypeEncodingMap[obj.type];
  let colorCode: number;
  if (hasColor(obj)) {
    colorCode = colorEncodingMap[obj.color];
  } else {
    colorCode = colorEncodingMap[""];
  }
  let fallingCode: number;
  if (hasFalling(obj)) {
    fallingCode = isFallingEncodingMap[String(obj.isFalling)];
  } else {
    fallingCode = isFallingEncodingMap["false"];
  }
  // bitwise OR the codes together, then get ascii character
  // 0b1000000 makes output easier to read
  const encoded: number = 0b1000000 | fallingCode | colorCode | typeCode;
  return String.fromCharCode(encoded);
}

export function decodeGrid(encoded: EncodedGrid): GameGrid {
  // const invalidGridMessage = "Invalid encoded grid: " + encoded;

  // header looks like `g9x17:`
  const headerEndIndex = encoded.indexOf(":");
  if (encoded[0] !== "g" || headerEndIndex < 4) throw new Error("invalidGridMessage");
  const headerValStr = encoded.slice(1, headerEndIndex);
  const headerNumStrs = headerValStr.split("z");
  console.log(headerValStr, headerNumStrs);
  invariant(headerNumStrs.length === 2, "grid header must contain grid size");
  const rowCount = parseInt(headerNumStrs[0], 35);
  const colCount = parseInt(headerNumStrs[1], 35);
  invariant(isFinite(rowCount) && isFinite(colCount), "invalid grid size");

  const gridStr = encoded.slice(headerEndIndex + 1);
  invariant(gridStr.length === rowCount * colCount, "grid size does not match header");

  let grid: GameGrid = [];
  let gridStrIndex = 0;
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    let row: GameGridRow = [];
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const gridObj = decodeGridObject(gridStr[gridStrIndex]);
      row.push(gridObj);
      gridStrIndex += 1;
    }
    grid.push(row);
  }
  return grid;
}

//
// export function chunkString(str: string, chunkLength: number) {
//   const chunks: string[] = [];
//   for (let offset = 0, strLen = str.length; offset < strLen; offset += chunkLength) {
//     chunks.push(str.slice(offset, chunkLength + offset));
//   }
//   return chunks;
// }

export function decodeGridObject(encodedStr: EncodedGridObject): GridObject {
  const encoded: number = encodedStr.charCodeAt(0);
  const typeCode = encoded & 0b000111;
  const colorCode = encoded & 0b011000;
  const fallingCode = encoded & 0b100000;

  const type = binaryGridObjectTypeMap[typeCode + ""] as GridObjectType;
  let obj: object = { type };

  const colorStr = binaryColorMap[colorCode + ""];
  if (colorStr !== "") {
    obj["color"] = parseInt(colorStr) as GameColor;
  }

  const isFalling = binaryIsFallingMap[fallingCode + ""] === "true";
  if (isFalling) (obj as GridObjectWithFalling).isFalling = true;

  // todo better typing...
  return obj as GridObject;
}

export function encodePillColors(pillColors: PillColors): string {
  const color0: number = pillColors[0].color;
  const color1: number = pillColors[1].color;
  return parseInt( String(color0) + String(color1), 10).toString(36);
}

export function encodePillSequence(pillSequence: PillColors[]) {
  return pillSequence.map(pillColors => {
    return encodePillColors(pillColors);
  }).join('');
}


export function encodeMovingCounters(movingCounters: MovingCounters) {
  return Array.from(movingCounters.values()).join(',')
}

export function encodeMovingDirections(movingDirections: MovingDirections) {
  return Array.from(movingDirections.keys()).join(',');
}

export function encodeGameState(gameState: GameState) {
  return JSON.stringify({
    ...gameState,
    grid: encodeGrid(gameState.grid),
    movingCounters: encodeMovingCounters(gameState.movingCounters),
    movingDirections: encodeMovingDirections(gameState.movingDirections),
    pillSequence: encodePillSequence(gameState.pillSequence)
  })
}
