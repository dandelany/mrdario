import { flatten, sample, times } from "lodash";

import { GameColor, GameGrid, GridObject, GridObjectType } from "../../../game/types";
import { getGridEncodingDictionary, tGameGridCodec } from "./grid";
import { tGridObjectCodec } from "./gridObject";
import { toDecodeWith } from "../../../utils/jest";
import { isRight } from "fp-ts/lib/Either";
import { decodeOrThrow } from "../../../utils/io";

expect.extend({ toDecodeWith });

describe("Grid Encoding", () => {
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
        { type: GridObjectType.PillSegment, color: GameColor.Color1 }
      ],
      [
        { type: GridObjectType.PillLeft, color: GameColor.Color3 },
        { type: GridObjectType.PillRight, color: GameColor.Color2 },
        { type: GridObjectType.Destroyed }
      ]
    ];
    // check that decode(encode(obj)) deep equals original obj
    flatten(grid).forEach((gridObj: GridObject) => {
      const encoded = tGridObjectCodec.encode(gridObj);
      expect(typeof encoded).toEqual("string");

      expect(encoded).toDecodeWith(tGridObjectCodec);
      const decoded = tGridObjectCodec.decode(encoded);
      if(isRight(decoded)) expect(decoded.right).toEqual(gridObj);

    });
    // const encoded = encodeGrid(grid);
    const encodedGrid = tGameGridCodec.encode(grid);
    expect(typeof encodedGrid).toBe("string");
    expect(encodedGrid).toDecodeWith(tGameGridCodec);
    expect(decodeOrThrow(tGameGridCodec, encodedGrid)).toEqual(grid);
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
    // expect(decodeGrid(encodeGrid(grid))).toEqual(grid);
    const decoded = decodeOrThrow(tGameGridCodec, tGameGridCodec.encode(grid));
    expect(decoded).toEqual(grid);
  });

  test("allows linebreaks + spaces in grid", () => {
    const gridStr = `g4,3:
      XVO
      NYE
      SXK
      DRY`;

    getGridEncodingDictionary();

    expect(gridStr).toDecodeWith(tGameGridCodec);
    expect(decodeOrThrow(tGameGridCodec, gridStr)).toEqual([
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
        { type: GridObjectType.PillSegment, color: GameColor.Color1 }
      ],
      [
        { type: GridObjectType.PillLeft, color: GameColor.Color3 },
        { type: GridObjectType.PillRight, color: GameColor.Color2 },
        { type: GridObjectType.Destroyed }
      ]
    ]);
  });
});
