import { invert } from "lodash";

import { GameColor, GridObject, GridObjectType } from "../game";
import { hasColor } from "../game/utils";

export type EncodedGridObject = string;
export type GridObjectTypeBinaryEncodingMap = { [T in GridObjectType]: number };
export type ColorBinaryEncodingMap = { [C in GameColor | ""]: number };

// binary encodings for grid objects

export const gridObjectTypeEncodingMap: GridObjectTypeBinaryEncodingMap = {
  [GridObjectType.Empty]: 0b000,
  [GridObjectType.Destroyed]: 0b001,
  [GridObjectType.PillRight]: 0b010,
  [GridObjectType.PillSegment]: 0b011,
  [GridObjectType.PillLeft]: 0b100,
  [GridObjectType.PillBottom]: 0b101,
  [GridObjectType.Virus]: 0b110,
  [GridObjectType.PillTop]: 0b111
};
export const binaryGridObjectTypeMap = invert(gridObjectTypeEncodingMap);

export const colorEncodingMap: ColorBinaryEncodingMap = {
  "": 0b11000,
  [GameColor.Color1]: 0b01000,
  [GameColor.Color2]: 0b10000,
  [GameColor.Color3]: 0b00000
};
export const binaryColorMap = invert(colorEncodingMap);

// todo validation?

export function encodeGridObject(obj: GridObject): EncodedGridObject {
  const typeCode: number = gridObjectTypeEncodingMap[obj.type];
  let colorCode: number;
  if (hasColor(obj)) {
    colorCode = colorEncodingMap[obj.color];
  } else {
    colorCode = colorEncodingMap[""];
  }
  // bitwise OR the codes together, then get ascii character
  // 0b1000000 makes output easier to read
  const encoded: number = 0b1000000 | colorCode | typeCode;
  return String.fromCharCode(encoded);
}

export function decodeGridObject(encodedStr: EncodedGridObject): GridObject {
  const encoded: number = encodedStr.charCodeAt(0);
  const typeCode = encoded & 0b000111;
  const colorCode = encoded & 0b011000;

  const type = binaryGridObjectTypeMap[typeCode + ""] as GridObjectType;
  let obj: object = { type };

  const colorStr = binaryColorMap[colorCode + ""];
  if (colorStr !== "") {
    obj["color"] = parseInt(colorStr) as GameColor;
  }

  // todo better typing...
  return obj as GridObject;
}
