import {
  colorEncodingMap,
  decodeGrid,
  decodeGridObject, decodeMoveInputEvent,
  encodeGrid,
  encodeGridObject, encodeMoveInputEvent,
  gridObjectTypeEncodingMap,
  isFallingEncodingMap
} from "../../api";
import { flatten, sample, times, uniq, values } from "lodash";
import {
  GameColor,
  GameGrid,
  GameInput,
  GameInputMove,
  GridObject,
  GridObjectType,
  InputEventType,
  MoveInputEvent
} from "../../types";
// import { GameColor, GridObjectType } from "../../types";
// import { makeDestroyed, makePillLeft, makePillRight } from "../../utils/generators";

function hasDuplicates(arr: (string | number)[]): boolean {
  const strArr: string[] = arr.map((d: string | number) => d + "");
  return uniq(strArr).length !== strArr.length;
}

describe("API", () => {
  test("gridObjectTypeEncodingMap", () => {
    const binaryVals: number[] = values(gridObjectTypeEncodingMap);
    // expect encoded values to be unique
    expect(hasDuplicates(binaryVals)).toBeFalsy();
    expect(
      binaryVals.every((val: number) => {
        return val < 0b1000;
      })
    ).toBeTruthy();
  });
  test("colorEncodingMap", () => {
    const binaryVals: number[] = values(colorEncodingMap);
    expect(hasDuplicates(binaryVals)).toBeFalsy();
    expect(
      binaryVals.every((val: number) => {
        return val < 0b100000 && (val === 0 || val > 0b111);
      })
    ).toBeTruthy();
  });
  test("isFallingEncodingMap", () => {
    const binaryVals: number[] = values(isFallingEncodingMap);
    expect(hasDuplicates(binaryVals)).toBeFalsy();
    expect(
      binaryVals.every((val: number) => {
        return val < 0b1000000 && (val === 0 || val > 0b11111);
      })
    ).toBeTruthy();
  });
  test("encode and decode grid", () => {
    const grid: GameGrid = [
      [
        { type: GridObjectType.Empty },
        { type: GridObjectType.Virus, color: GameColor.Color2 },
        { type: GridObjectType.PillTop, color: GameColor.Color1 }
      ],
      [
        { type: GridObjectType.Virus, color: GameColor.Color1 },
        { type: GridObjectType.Destroyed },
        { type: GridObjectType.PillBottom, color: GameColor.Color3 }
      ],
      [
        { type: GridObjectType.PillSegment, color: GameColor.Color2 },
        { type: GridObjectType.Empty },
        { type: GridObjectType.PillSegment, color: GameColor.Color1, isFalling: true }
      ],
      [
        { type: GridObjectType.PillLeft, color: GameColor.Color3 },
        { type: GridObjectType.PillRight, color: GameColor.Color2 },
        { type: GridObjectType.Destroyed }
      ]
    ];
    // check that decode(encode(obj)) deep equals original obj
    flatten(grid).forEach((gridObj: GridObject) => {
      expect(decodeGridObject(encodeGridObject(gridObj))).toEqual(gridObj);
    });
    expect(decodeGrid(encodeGrid(grid))).toEqual(grid);
  });

  test("encode and decode long grid", () => {
    const grid: GameGrid = times(40, () => {
      return times(80, () => {
        return {
          type: sample([GridObjectType.Virus, GridObjectType.PillSegment]),
          color: sample([GameColor.Color1, GameColor.Color2, GameColor.Color3])
        };
      });
    }) as GameGrid;
    expect(decodeGrid(encodeGrid(grid))).toEqual(grid);
  });

  test("encode and decode move input events", () => {
    ([
      GameInput.Up,
      GameInput.Down,
      GameInput.Left,
      GameInput.Right,
      GameInput.RotateCW,
      GameInput.RotateCCW
    ] as GameInputMove[]).forEach(input => {
      ([InputEventType.KeyDown, InputEventType.KeyUp]).forEach(eventType => {
        const event: MoveInputEvent = {input, eventType};
        console.log(encodeMoveInputEvent(event));
        expect(decodeMoveInputEvent(encodeMoveInputEvent(event))).toEqual(event);
      })
    });
  });
});
