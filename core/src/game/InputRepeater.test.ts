import { times } from "lodash";
import { GameActionType, GameInput, INPUT_REPEAT_INTERVALS, InputEventType } from "../index";
import { InputRepeater } from "./InputRepeater";

describe("InputRepeater", () => {
  test("Can be constructed with correct initial state", () => {
    const repeater: InputRepeater = new InputRepeater();
    expect(repeater).toBeInstanceOf(InputRepeater);
    expect(repeater.movingCounters).toEqual({});
  });

  test("tick() immediately returns moves when it receives keydown events", () => {
    const repeater: InputRepeater = new InputRepeater();
    const noMoves = repeater.tick();
    expect(noMoves).toEqual([]);
    const oneMove = repeater.tick([
      { type: GameActionType.Move, input: GameInput.Left, eventType: InputEventType.KeyDown }
    ]);
    expect(oneMove).toEqual([GameInput.Left]);
  });

  test("Adds keydown inputs to movingCounters, and counts how many ticks they've been held down for", () => {
    const repeater: InputRepeater = new InputRepeater();
    repeater.tick([{ type: GameActionType.Move, input: GameInput.Right, eventType: InputEventType.KeyDown }]);
    times(2, () => repeater.tick());
    repeater.tick([
      { type: GameActionType.Move, input: GameInput.Left, eventType: InputEventType.KeyDown },
      { type: GameActionType.Move, input: GameInput.Down, eventType: InputEventType.KeyDown }
    ]);
    times(2, () => repeater.tick());
    const entries = Object.entries(repeater.movingCounters);
    expect(entries).toEqual([[GameInput.Right, 5], [GameInput.Left, 2], [GameInput.Down, 2]]);
  });

  test("Returns moves which have been held down long enough to repeat", () => {
    const repeater: InputRepeater = new InputRepeater();
    const move = repeater.tick([
      { type: GameActionType.Move, input: GameInput.Right, eventType: InputEventType.KeyDown }
    ]);
    expect(move).toEqual([GameInput.Right]);
    const entries = Object.entries(repeater.movingCounters);
    expect(entries).toEqual([[GameInput.Right, 0]]);

    times(3, () => {
      times(INPUT_REPEAT_INTERVALS[GameInput.Right] - 1, () => {
        const noMoves = repeater.tick();
        expect(noMoves).toEqual([]);
      });
      const repeatedMove = repeater.tick();
      expect(repeatedMove).toEqual([GameInput.Right]);
    });
  });

  test("Removes inputs from movingCounters when tick() is called with keyup events", () => {
    const repeater: InputRepeater = new InputRepeater();
    repeater.tick([{ type: GameActionType.Move, input: GameInput.Right, eventType: InputEventType.KeyDown }]);
    times(2, () => repeater.tick());
    repeater.tick([
      { type: GameActionType.Move, input: GameInput.Left, eventType: InputEventType.KeyDown },
      { type: GameActionType.Move, input: GameInput.Down, eventType: InputEventType.KeyDown }
    ]);
    repeater.tick();
    expect(Object.keys(repeater.movingCounters)).toEqual([
      GameInput.Right,
      GameInput.Left,
      GameInput.Down
    ]);
    repeater.tick([
      { type: GameActionType.Move, input: GameInput.Left, eventType: InputEventType.KeyUp },
      { type: GameActionType.Move, input: GameInput.Right, eventType: InputEventType.KeyUp }
    ]);
    expect(Object.keys(repeater.movingCounters)).toEqual([GameInput.Down]);
    repeater.tick([{ type: GameActionType.Move, input: GameInput.Down, eventType: InputEventType.KeyUp }]);
    expect(Object.keys(repeater.movingCounters)).toEqual([]);
  });

  // test.todo("Ignores subsequent keydown events when input is already pressed");
  // test.todo("Ignores keyup events when input is not in movingCounters");
});
