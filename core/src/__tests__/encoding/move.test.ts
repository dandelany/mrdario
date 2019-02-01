import { GameInput, GameInputMove, InputEventType, MoveInputEvent } from "../../types";
import { decodeMoveInputEvent, encodeMoveInputEvent } from "../../encoding";

describe("Move Encoding", () => {
  test("encode and decode move input events", () => {
    ([
      GameInput.Up,
      GameInput.Down,
      GameInput.Left,
      GameInput.Right,
      GameInput.RotateCW,
      GameInput.RotateCCW
    ] as GameInputMove[]).forEach(input => {
      [InputEventType.KeyDown, InputEventType.KeyUp].forEach(eventType => {
        const event: MoveInputEvent = { input, eventType };
        expect(decodeMoveInputEvent(encodeMoveInputEvent(event))).toEqual(event);
      });
    });
  });
});
