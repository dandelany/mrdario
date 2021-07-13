import * as t from "io-ts";
import { invert } from "lodash";

import {
  GameColor,
  GridObject,
  GridObjectType,
  GridObjectWithColor,
  tGridObjectType
} from "../../../game/types";
import { hasColor } from "../../../game/utils";

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
export const binaryGridObjectTypeMap = invert(gridObjectTypeEncodingMap) as { [k in string]: GridObjectType };

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
  const obj: object = { type };

  const colorStr = binaryColorMap[colorCode + ""];
  if (colorStr !== "") {
    (obj as GridObjectWithColor).color = parseInt(colorStr, 10) as GameColor;
  }

  // todo better typing...
  return obj as GridObject;
}

export const tGridObjectCodec = new t.Type<GridObject, string, unknown>(
  "GridObject",
  // todo custom guard?
  (a: unknown): a is GridObject => t.type({ type: tGridObjectType }).is(a),
  // decode grid object
  (input: unknown, context) => {
    if (!t.string.is(input) || input.length === 0) {
      return t.failure(input, context, "Invalid");
    }
    const encoded: number = input.charCodeAt(0);
    const typeCodeStr = String(encoded & 0b000111);
    const colorCodeStr = String(encoded & 0b011000);

    if (!(typeCodeStr in binaryGridObjectTypeMap)) {
      return t.failure(input, context, "Invalid GridObject type code");
    }
    const type = binaryGridObjectTypeMap[typeCodeStr];

    if (!(colorCodeStr in binaryColorMap)) {
      return t.failure(input, context, "Invalid GridObject color code");
    }
    const colorStr = binaryColorMap[colorCodeStr];
    const colorPart = colorStr === "" ? {} : { color: parseInt(colorStr, 10) as GameColor };

    return t.success({ type, ...colorPart } as GridObject);
  },
  (gridObject: GridObject) => {
    return encodeGridObject(gridObject);
  }
);
