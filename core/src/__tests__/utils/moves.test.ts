import { givePill, moveCell, moveCells, movePill, slamPill } from "../../utils/moves";
import { decodeGrid } from "../../encoding";
import { Direction, GameColor } from "../../types";

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
      expect(grid).toEqual(
        decodeGrid(`g4,4:
        XXXX
        XXSX
        NXLR
        XXVF
      `)
      );
    });
  });

  describe("moveCell()", () => {
    test("Moves grid object up", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XCX
        XXX
      `);
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], Direction.Up);
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
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], Direction.Down);
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
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], Direction.Left);
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
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], Direction.Right);
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
      const { didMove, cell, grid } = moveCell(startGrid, [1, 1], Direction.Right);
      expect(didMove).toEqual(false);
      expect(cell).toEqual([1, 1]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XXX
        XCV
        XXX
      `)
      );
    });
    test("Doesn't move if location would be outside grid bounds", () => {
      const startGrid = decodeGrid(`g3,3:
        XCX
        XXX
        XXX
      `);
      const { didMove, cell, grid } = moveCell(startGrid, [0, 1], Direction.Up);
      expect(didMove).toEqual(false);
      expect(cell).toEqual([0, 1]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        XCX
        XXX
        XXX
      `)
      );
    });
  });

  describe("moveCells()", () => {
    test("Moves grid objects up", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XOX
        XUX
      `);
      const { didMove, cells, grid } = moveCells(startGrid, [[1, 1], [2, 1]], Direction.Up);
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
      const { didMove, cells, grid } = moveCells(startGrid, [[1, 1], [1, 2]], Direction.Down);
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
      const { didMove, cells, grid } = moveCells(startGrid, [[1, 1], [1, 2]], Direction.Left);
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
      const { didMove, cells, grid } = moveCells(startGrid, [[0, 0], [1, 0]], Direction.Right);
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
      const { didMove, cells, grid } = moveCells(startGrid, [[0, 0], [1, 0]], Direction.Right);
      expect(didMove).toEqual(false);
      expect(cells).toEqual([[0, 0], [1, 0]]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        OXX
        UFX
        XXX
      `)
      );
    });
    test("Doesn't move if any of the destinations are outside the grid", () => {
      const startGrid = decodeGrid(`g3,3:
        OXX
        UXX
        XXX
      `);
      const { didMove, cells, grid } = moveCells(startGrid, [[0, 0], [1, 0]], Direction.Up);
      expect(didMove).toEqual(false);
      expect(cells).toEqual([[0, 0], [1, 0]]);
      expect(grid).toEqual(
        decodeGrid(`g3,3:
        OXX
        UXX
        XXX
      `)
      );
    });
  });

  describe("movePill()", () => {
    test("Moves two grid objects (a pill)", () => {
      const startGrid = decodeGrid(`g3,3:
        XXX
        XTR
        XXX
      `);
      const { didMove, pill, grid } = movePill(startGrid, [[1, 1], [1, 2]], Direction.Left);
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
      expect(grid).toEqual(
        decodeGrid(`g6,4:
        XXXX
        XLRX
        XFXX
        XXXX
        XXFX
        XXXX`)
      );
    });
  });

  describe("rotatePill()", () => {});
  describe("destroyLines()", () => {});
  describe("removeDestroyed()", () => {});
  describe("dropDebris()", () => {});
  describe("dropDebris()", () => {});
  describe("clearTopRow()", () => {});


});
