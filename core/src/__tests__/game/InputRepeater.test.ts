import { InputRepeater } from "../../game/InputRepeater";
import { GameActionType, GameInput, INPUT_REPEAT_INTERVALS, InputEventType } from "../../game";
import { times } from "lodash";

describe("InputRepeater", () => {
  test("Can be constructed with correct initial state", () => {
    const repeater: InputRepeater = new InputRepeater();
    expect(repeater).toBeInstanceOf(InputRepeater);
    expect(repeater.movingCounters).toBeInstanceOf(Map);
    expect(Array.from(repeater.movingCounters.entries())).toHaveLength(0);
  });

  test("tick() immediately returns moves when it receives keydown events", () => {
    const repeater: InputRepeater = new InputRepeater();
    const noMoves = repeater.tick();
    expect(noMoves).toEqual([]);
    const oneMove = repeater.tick([{ type: GameActionType.Move, input: GameInput.Left, eventType: InputEventType.KeyDown }]);
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
    const entries = Array.from(repeater.movingCounters.entries());
    expect(entries).toEqual([[GameInput.Right, 5], [GameInput.Left, 2], [GameInput.Down, 2]]);
  });

  test("Returns moves which have been held down long enough to repeat", () => {
    const repeater: InputRepeater = new InputRepeater();
    const move = repeater.tick([{ type: GameActionType.Move, input: GameInput.Right, eventType: InputEventType.KeyDown }]);
    expect(move).toEqual([GameInput.Right]);
    const entries = Array.from(repeater.movingCounters.entries());
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
    expect(Array.from(repeater.movingCounters.keys())).toEqual([
      GameInput.Right,
      GameInput.Left,
      GameInput.Down
    ]);
    repeater.tick([
      { type: GameActionType.Move,input: GameInput.Left, eventType: InputEventType.KeyUp },
      { type: GameActionType.Move,input: GameInput.Right, eventType: InputEventType.KeyUp }
    ]);
    expect(Array.from(repeater.movingCounters.keys())).toEqual([GameInput.Down]);
    repeater.tick([{ type: GameActionType.Move, input: GameInput.Down, eventType: InputEventType.KeyUp }]);
    expect(Array.from(repeater.movingCounters.keys())).toEqual([]);
  });

  // test.todo("Ignores subsequent keydown events when input is already pressed");
  // test.todo("Ignores keyup events when input is not in movingCounters");
});
