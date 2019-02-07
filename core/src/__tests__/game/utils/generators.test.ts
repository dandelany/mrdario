import {
  GameColor,
  GridObjectDestroyed,
  GridObjectEmpty,
  GridObjectPillLeft,
  GridObjectPillRight,
  GridObjectType,
  GridObjectVirus
} from "../../../game/types";
import {
  makeDestroyed,
  makeEmpty,
  makeEmptyGrid,
  makeEmptyGridRow,
  makePillLeft,
  makePillRight,
  makeVirus
} from "../../../game/utils";

describe("Generators", () => {
  test("makeEmpty", () => {
    const mockEmpty: GridObjectEmpty = { type: GridObjectType.Empty };
    const empty = makeEmpty();
    expect(empty).toEqual(mockEmpty);
    expect(empty).not.toBe(mockEmpty);
  });
  test("makeDestroyed", () => {
    const mockDestroyed: GridObjectDestroyed = {
      type: GridObjectType.Destroyed
    };
    const destroyed = makeDestroyed();
    expect(destroyed).toEqual(mockDestroyed);
    expect(destroyed).not.toBe(mockDestroyed);
  });
  test("makeVirus", () => {
    const mockVirus: GridObjectVirus = {
      type: GridObjectType.Virus,
      color: GameColor.Color2
    };
    const virus = makeVirus(GameColor.Color2);
    expect(virus).toEqual(mockVirus);
    expect(virus).not.toBe(mockVirus);
  });
  test("makePillLeft", () => {
    const mockPillLeft: GridObjectPillLeft = {
      type: GridObjectType.PillLeft,
      color: GameColor.Color1
    };
    const pillLeft = makePillLeft(GameColor.Color1);
    expect(pillLeft).toEqual(mockPillLeft);
    expect(pillLeft).not.toBe(makePillLeft(GameColor.Color1));
  });
  test("makePillRight", () => {
    const mockPillRight: GridObjectPillRight = {
      type: GridObjectType.PillRight,
      color: GameColor.Color3
    };
    const pillRight = makePillRight(GameColor.Color3);
    expect(pillRight).toEqual(mockPillRight);
    expect(pillRight).not.toBe(makePillRight(GameColor.Color3));
  });
  test("makeEmptyGridRow", () => {
    const mockEmptyGridRow = [
      { type: GridObjectType.Empty },
      { type: GridObjectType.Empty },
      { type: GridObjectType.Empty },
      { type: GridObjectType.Empty }
    ];
    const emptyRow = makeEmptyGridRow(4);
    expect(emptyRow).toEqual(mockEmptyGridRow);
  });
  test("makeEmptyGrid", () => {
    const mockEmptyGrid = [
      [{ type: GridObjectType.Empty }, { type: GridObjectType.Empty }, { type: GridObjectType.Empty }],
      [{ type: GridObjectType.Empty }, { type: GridObjectType.Empty }, { type: GridObjectType.Empty }]
    ];
    const emptyGrid = makeEmptyGrid(3, 2);
    expect(emptyGrid).toEqual(mockEmptyGrid);
  });
});
