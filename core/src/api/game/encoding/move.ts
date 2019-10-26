import invariant from "invariant";
import { invert } from "lodash";

import { GameInput, GameInputMove, InputEventType, MoveInputEvent } from "../../../game/types";

// binary encodings for move inputs

export type EncodedMoveInputEvent = string;
export type MoveInputBinaryEncodingMap = { [I in GameInputMove]: number };
export type InputEventTypeEncodingMap = { [T in InputEventType]: number };

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

// encode/decode functions

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
