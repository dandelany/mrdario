import {
  clearTopRow,
  destroyLines,
  dropDebris,
  givePill,
  moveCell,
  moveCells,
  movePill,
  removeDestroyed,
  rotatePill,
  slamPill
} from "@/game/utils/moves";
import { GridDirection, GameColor, RotateDirection } from "@/game/enums";
import { decodeGrid } from "@/encoding";

/*
Y = Destroyed
X = Empty
O = PillTop Color1
W = PillTop Color2
G = PillTop Color3
M = PillBottom Color1
U = PillBottom Color2
E = PillBottom Color3
L = PillLeft Color1
T = PillLeft Color2
D = PillLeft Color3
J = PillRight Color1
R = PillRight Color2
B = PillRight Color3
K = PillSegment Color1
S = PillSegment Color2
C = PillSegment Color3
N = Virus Color1
V = Virus Color2
F = Virus Color3
*/

describe("Moves", () => {
  describe("givePill()", function() {
    test("Gives pill to grid when space exists", () => {
      const startGrid = decodeGrid(`g4,4:
        XXXX
        XXXX
        NXXX
        XXVF
      `);
      const { grid, didGive } = givePill(startGrid, [
        { color: GameColor.Color3 },
        { color: GameColor.Color1 }
      ]);
      expect(didGive).toEqual(true);
      expect(grid).toEqual(
        decodeGrid(`g4,4:
        XXXX
        XDJX
        NXXX
        XXVF
      `)
      );
    });
    test("Doesn't give pill if space is blocked", () => {
      const startGrid = decodeGrid(`g4,4:
        XXXX
        XXSX
        NXLR
        XXVF
      `);
      const { grid, didGive } = givePill(startGrid, [
        { color: GameColor.Color3 },
        { color: GameColor.Color1 }
      ]);
      expect(didGive).toEqual(false);
      expect(grid).toEqual(startGrid);
    });
  });

  describe("moveCell()", () => {
    test("Moves grid object up", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XCX
        XXX
      `);
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], GridDirection.Up);
      expect(didMove).toEqual(true);
      expect(cell).toEqual([0, 1]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XCX
        XXX
        XXX
      `)
      );
    });
    test("Moves grid object down", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XCX
        XXX
      `);
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], GridDirection.Down);
      expect(didMove).toEqual(true);
      expect(cell).toEqual([2, 1]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XXX
        XXX
        XCX
      `)
      );
    });
    test("Moves grid object left", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XCX
        XXX
      `);
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], GridDirection.Left);
      expect(didMove).toEqual(true);
      expect(cell).toEqual([1, 0]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XXX
        CXX
        XXX
      `)
      );
    });
    test("Moves grid object right", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XCX
        XXX
      `);
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], GridDirection.Right);
      expect(didMove).toEqual(true);
      expect(cell).toEqual([1, 2]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XXX
        XXC
        XXX
      `)
      );
    });
    test("Doesn't move if space is occupied", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XCV
        XXX
      `);
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], GridDirection.Right);
      expect(didMove).toEqual(false);
      expect(cell).toEqual([1, 1]);
      expect(grid).toEqual(startGrid);
    });
    test("Doesn't move if location would be outside grid bounds", () => {
      const startGrid = decodeGrid(`g3,3:
        XCX
        XXX
        XXX
      `);
      const { didMove, cell, grid } = moveCell(startGrid, [0, 1], GridDirection.Up);
      expect(didMove).toEqual(false);
      expect(cell).toEqual([0, 1]);
      expect(grid).toEqual(startGrid);
    });
  });

  describe("moveCells()", () => {
    test("Moves grid objects up", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XOX
        XUX
      `);
      const { didMove, cells, grid } = moveCells(startGrid, [[1, 1], [2, 1]], GridDirection.Up);
      expect(didMove).toEqual(true);
      expect(cells).toEqual([[0, 1], [1, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XOX
        XUX
        XXX
      `)
      );
    });
    test("Moves grid objects down", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XLB
        XXX
      `);
      const { didMove, cells, grid } = moveCells(startGrid, [[1, 1], [1, 2]], GridDirection.Down);
      expect(didMove).toEqual(true);
      expect(cells).toEqual([[2, 1], [2, 2]]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XXX
        XXX
        XLB
      `)
      );
    });
    test("Moves grid objects left", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XLB
        XXX
      `);
      const { didMove, cells, grid } = moveCells(startGrid, [[1, 1], [1, 2]], GridDirection.Left);
      expect(didMove).toEqual(true);
      expect(cells).toEqual([[1, 0], [1, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XXX
        LBX
        XXX
      `)
      );
    });
    test("Moves grid objects right", () => {
      const startGrid = decodeGrid(`g3,3:
        OXX
        UXX
        XXX
      `);
      const { didMove, cells, grid } = moveCells(startGrid, [[0, 0], [1, 0]], GridDirection.Right);
      expect(didMove).toEqual(true);
      expect(cells).toEqual([[0, 1], [1, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XOX
        XUX
        XXX
      `)
      );
    });
    test("Doesn't move if any of the destination spaces are occupied", () => {
      const startGrid = decodeGrid(`g3,3:
        OXX
        UFX
        XXX
      `);
      const { didMove, cells, grid } = moveCells(startGrid, [[0, 0], [1, 0]], GridDirection.Right);
      expect(didMove).toEqual(false);
      expect(cells).toEqual([[0, 0], [1, 0]]);
      expect(grid).toEqual(startGrid);
    });
    test("Doesn't move if any of the destinations are outside the grid", () => {
      const startGrid = decodeGrid(`g3,3:
        OXX
        UXX
        XXX
      `);
      const { didMove, cells, grid } = moveCells(startGrid, [[0, 0], [1, 0]], GridDirection.Up);
      expect(didMove).toEqual(false);
      expect(cells).toEqual([[0, 0], [1, 0]]);
      expect(grid).toEqual(startGrid);
    });
  });

  describe("movePill()", () => {
    test("Moves two grid objects (a pill)", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XTR
        XXX
      `);
      const { didMove, pill, grid } = movePill(startGrid, [[1, 1], [1, 2]], GridDirection.Left);
      expect(didMove).toEqual(true);
      expect(pill).toEqual([[1, 0], [1, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XXX
        TRX
        XXX
      `)
      );
    });
  });

  describe("slamPill()", () => {
    test("Slams a horizontal pill down to the lowest empty space directly below it", () => {
      const startGrid = decodeGrid(`g6,4:
        XXXX
        XLRX
        XXXX
        XXXX
        XXFX
        XXXX`);
      const { didMove, pill, grid } = slamPill(startGrid, [[1, 1], [1, 2]]);
      expect(didMove).toEqual(true);
      expect(pill).toEqual([[3, 1], [3, 2]]);
      expect(grid).toEqual(
        decodeGrid(`g6,4:
        XXXX
        XXXX
        XXXX
        XLRX
        XXFX
        XXXX`)
      );
    });
    test("Slams a vertical pill down to the lowest empty space directly below it", () => {
      const startGrid = decodeGrid(`g6,4:
        XXXX
        XOXX
        XUXX
        XXXX
        XXFX
        XXXX`);
      const { didMove, pill, grid } = slamPill(startGrid, [[1, 1], [2, 1]]);
      expect(didMove).toEqual(true);
      expect(pill).toEqual([[4, 1], [5, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g6,4:
        XXXX
        XXXX
        XXXX
        XXXX
        XOFX
        XUXX`)
      );
    });
    test("Doesn't slam if anything is blocking the way", () => {
      const startGrid = decodeGrid(`g6,4:
        XXXX
        XLRX
        XFXX
        XXXX
        XXFX
        XXXX`);
      const { didMove, pill, grid } = slamPill(startGrid, [[1, 1], [1, 2]]);
      expect(didMove).toEqual(false);
      expect(pill).toEqual([[1, 1], [1, 2]]);
      expect(grid).toEqual(startGrid);
    });
  });

  describe("rotatePill()", () => {
    test("Rotates a horizontal pill clockwise", () => {
      const startGrid = decodeGrid(`g2,2:
        XX
        LB`);
      const { grid, pill, didMove } = rotatePill(
        startGrid,
        [[1, 0], [1, 1]],
        RotateDirection.Clockwise
      );
      expect(didMove).toBe(true);
      expect(pill).toEqual([[0, 0], [1, 0]]);
      expect(grid).toEqual(
        decodeGrid(`g2,2:
          OX
          EX`)
      );
    });
    test("Rotates a horizontal pill counterclockwise", () => {
      const startGrid = decodeGrid(`g2,2:
        XX
        LB`);
      const { grid, pill, didMove } = rotatePill(
        startGrid,
        [[1, 0], [1, 1]],
        RotateDirection.CounterClockwise
      );
      expect(didMove).toBe(true);
      expect(pill).toEqual([[0, 0], [1, 0]]);
      expect(grid).toEqual(
        decodeGrid(`g2,2:
          GX
          MX`)
      );
    });
    test("Rotates a vertical pill clockwise", () => {
      const startGrid = decodeGrid(`g2,2:
        WX
        EX`);
      const { grid, pill, didMove } = rotatePill(
        startGrid,
        [[0, 0], [1, 0]],
        RotateDirection.Clockwise
      );
      expect(didMove).toBe(true);
      expect(pill).toEqual([[1, 0], [1, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g2,2:
          XX
          DR`)
      );
    });
    test("Rotates a vertical pill counterclockwise", () => {
      const startGrid = decodeGrid(`g2,2:
        WX
        EX`);
      const { grid, pill, didMove } = rotatePill(
        startGrid,
        [[0, 0], [1, 0]],
        RotateDirection.CounterClockwise
      );
      expect(didMove).toBe(true);
      expect(pill).toEqual([[1, 0], [1, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g2,2:
          XX
          TB`)
      );
    });
    test("Rotates clockwise + kicks left when vertical pill has right neighbor", () => {
      const startGrid = decodeGrid(`g2,3:
        XWX
        XES`);
      const { grid, pill, didMove } = rotatePill(
        startGrid,
        [[0, 1], [1, 1]],
        RotateDirection.Clockwise
      );
      expect(didMove).toBe(true);
      expect(pill).toEqual([[1, 0], [1, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g2,3:
          XXX
          DRS`)
      );
    });
    test("Rotates counterclockwise + kicks left when vertical pill has right neighbor", () => {
      const startGrid = decodeGrid(`g2,3:
        XWX
        XES`);
      const { grid, pill, didMove } = rotatePill(
        startGrid,
        [[0, 1], [1, 1]],
        RotateDirection.CounterClockwise
      );
      expect(didMove).toBe(true);
      expect(pill).toEqual([[1, 0], [1, 1]]);
      expect(grid).toEqual(
        decodeGrid(`g2,3:
          XXX
          TBS`)
      );
    });
    test("Vertical pill doesn't rotate if both sides are blocked", () => {
      const startGrid = decodeGrid(`g2,3:
        XOX
        FUN`);
      const { grid, pill, didMove } = rotatePill(
        startGrid,
        [[0, 1], [1, 1]],
        RotateDirection.Clockwise
      );
      expect(didMove).toBe(false);
      expect(pill).toEqual([[0, 1], [1, 1]]);
      expect(grid).toEqual(startGrid);
    });
    test("Horizontal pill doesn't rotate if above-left space is blocked", () => {
      const startGrid = decodeGrid(`g3,2:
        CX
        LR
        XX`);
      const { grid, pill, didMove } = rotatePill(
        startGrid,
        [[1, 0], [1, 1]],
        RotateDirection.Clockwise
      );
      expect(didMove).toBe(false);
      expect(pill).toEqual([[1, 0], [1, 1]]);
      expect(grid).toEqual(startGrid);
    });
  });

  describe("destroyLines()", () => {
    // todo test destroyLines
    test("Destroys lines longer than 4 cells, changing pill halves into segments", () => {
      const startGrid = decodeGrid(`g6,6:
        TJXXXX
        NOKLJX
        XMFFXG
        XNXXXE
        XNXXXF
        XLJXXF
      `);
      const { grid, lines, hasLines, destroyedCount, virusCount } = destroyLines(startGrid);
      expect(hasLines).toBe(true);
      expect(destroyedCount).toBe(14);
      expect(virusCount).toBe(5);
      expect(lines).toEqual([
        [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
        [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]],
        [[2, 5], [3, 5], [4, 5], [5, 5]]
      ]);
      expect(grid).toEqual(
        decodeGrid(`g6,6:
        SYXXXX
        YYYYYX
        XYFFXY
        XYXXXY
        XYXXXY
        XYKXXY
      `)
      );
    });
    test("Doesn't destroy anything when no lines exist", () => {
      const startGrid = decodeGrid(`g4,4:
        LRSV
        GNNV
        MFFV
        CSSB
      `);
      const { grid, lines, hasLines, destroyedCount, virusCount } = destroyLines(startGrid);
      expect(hasLines).toBe(false);
      expect(destroyedCount).toBe(0);
      expect(virusCount).toBe(0);
      expect(lines).toEqual([]);
      expect(grid).toEqual(startGrid);
    });
    test("Excludes falling objects from being destroyed", () => {
      const startGrid = decodeGrid(`g3,5:
        XXGXX
        FFEFF
        XXXXX
      `);
      const { grid, lines, hasLines, destroyedCount, virusCount } = destroyLines(startGrid);
      expect(hasLines).toBe(false);
      expect(destroyedCount).toBe(0);
      expect(virusCount).toBe(0);
      expect(lines).toEqual([]);
      expect(grid).toEqual(startGrid);
    });
    test("Destroys lines adjacent to a falling object ", () => {
      const startGrid = decodeGrid(`g6,9:
        XXXXGXXGX
        XFFFEFFEF
        XXXXXXXFX
        XXXXWXXXX
        SVVVUVVVS
        VXXXXXXXV
      `);
      const { grid, lines, hasLines, destroyedCount, virusCount } = destroyLines(startGrid);
      expect(hasLines).toBe(true);
      expect(destroyedCount).toBe(12);
      expect(virusCount).toBe(9);
      expect(lines).toEqual([
        [[1, 5], [1, 6], [1, 7], [1, 8]],
        [[4, 0], [4, 1], [4, 2], [4, 3]],
        [[4, 5], [4, 6], [4, 7], [4, 8]]
      ]);
      expect(grid).toEqual(
        decodeGrid(`g6,9:
        XXXXGXXCX
        XFFFEYYYY
        XXXXXXXFX
        XXXXWXXXX
        YYYYUYYYY
        VXXXXXXXV
      `)
      );
    });
  });

  describe("removeDestroyed()", () => {
    test("Removes all destroyed objects in grid", () => {
      const startGrid = decodeGrid(`g4,4:
        YCYX
        NFYF
        YYYY
        LRYS`);
      const grid = removeDestroyed(startGrid);
      expect(grid).toEqual(
        decodeGrid(`g4,4:
        XCXX
        NFXF
        XXXX
        LRXS`)
      );
    });
  });

  describe("dropDebris()", () => {
    test("Drops all grid objects that are falling", () => {
      const startGrid = decodeGrid(`g6,5:
        CXSLR
        LRTBN
        XLRXX
        XXSXX
        XFXXX
        VVXVV
      `);
      const { grid, fallingCells } = dropDebris(startGrid);
      expect(fallingCells.reverse()).toEqual([
        [0, 2],
        [0, 0],
        [1, 3],
        [1, 2],
        [1, 1],
        [1, 0],
        [2, 2],
        [2, 1],
        [3, 2]
      ]);
      expect(grid).toEqual(
        decodeGrid(`g6,5:
        XXXLR
        CXSXN
        LRTBX
        XLRXX
        XFSXX
        VVXVV
      `)
      );
      const { grid: nextGrid, fallingCells: nextFalling } = dropDebris(grid);
      expect(nextFalling).toEqual([[4, 2]]);
      expect(nextGrid).toEqual(
        decodeGrid(`g6,5:
        XXXLR
        CXSXN
        LRTBX
        XLRXX
        XFXXX
        VVSVV
      `)
      );
    });
    test("Stops when nothing is falling", () => {
      const startGrid = decodeGrid(`g6,5:
        XXXLR
        CXSXN
        LRTBX
        XLRXX
        XFXXX
        VVSVV
      `);
      const { grid, fallingCells } = dropDebris(startGrid);
      expect(fallingCells).toEqual([]);
      expect(grid).toEqual(startGrid);
    });
  });

  describe("clearTopRow()", () => {
    test("Clears top row, changing pill halves into segments", () => {
      const startGrid = decodeGrid(`g2,5:
        XOXGW
        XMXUE
      `);
      const grid = clearTopRow(startGrid);
      expect(grid).toEqual(
        decodeGrid(`g2,5:
        XXXXX
        XKXSC
      `)
      );
    });
  });
});
