import { random, sample, times, values } from "lodash";

import {
  GameColor,
  GameGrid,
  GameGridRow,
  GridCellLocation,
  GridObject,
  GridObjectDestroyed,
  GridObjectEmpty,
  GridObjectPillLeft,
  GridObjectPillRight,
  GridObjectType,
  GridObjectVirus,
  MaybeGridObject,
  OneOrMore,
  PillColors
} from "../types";

import { MIN_VIRUS_ROW_TABLE, VIRUS_COUNT_TABLE } from "../constants";
import { getCellNeighbors, getInGrid, setInGrid } from "./grid";
import { hasColor, isColor, isEmpty } from "./guards";

export function makeEmpty(): GridObjectEmpty {
  return { type: GridObjectType.Empty };
}
export function makeDestroyed(): GridObjectDestroyed {
  return { type: GridObjectType.Destroyed };
}
export function makeVirus(color: GameColor): GridObjectVirus {
  return { type: GridObjectType.Virus, color };
}
export function makePillLeft(color: GameColor): GridObjectPillLeft {
  return { type: GridObjectType.PillLeft, color };
}
export function makePillRight(color: GameColor): GridObjectPillRight {
  return { type: GridObjectType.PillRight, color };
}

export function makeEmptyGridRow<W extends number>(width: W): GameGridRow<W> {
  return times<GridObject>(width, makeEmpty) as GameGridRow<W>;
}
export function makeEmptyGrid<W extends number, H extends number>(
  width: W,
  height: H
): GameGrid<W, H> {
  return times<GameGridRow<W>>(height, () => {
    return makeEmptyGridRow(width);
  }) as GameGrid<W, H>;
}

export function generatePillSequence(
  colors: OneOrMore<GameColor>,
  count: number = 128
): PillColors[] {
  return times<PillColors>(
    count,
    (): PillColors => {
      return [{ color: sample(colors) as GameColor }, { color: sample(colors) as GameColor }];
    }
  );
}

export function getLevelVirusCount(level: number): number {
  return VIRUS_COUNT_TABLE[Math.min(level, VIRUS_COUNT_TABLE.length - 1)];
}

export function generateEnemies(
  grid: GameGrid<number, number>,
  level: number,
  colors: OneOrMore<GameColor>
) {
  // generate random enemies in a (empty) grid
  // inspired by http://tetrisconcept.net/wiki/Dr._Mario#Virus_Generation
  let virusCount = getLevelVirusCount(level);
  const origVirusCount = virusCount;

  while (virusCount) {
    const { cell, virus } = generateVirus(grid, level, colors, virusCount);
    if (!virus || !cell) {
      continue;
    } // bad virus, try again
    grid = setInGrid(grid, cell, virus); // good virus, put it in the cell
    virusCount--;
  }

  return { grid, virusCount: origVirusCount };
}

export function generateVirus(
  grid: GameGrid<number, number>,
  level: number,
  colors: OneOrMore<GameColor>,
  remaining: number
) {
  const numRows = grid.length;
  const numCols = grid[0].length;
  // initial candidate row and column for our virus
  let vRow = random(minVirusRow(level), numRows - 1);
  let vCol = random(0, numCols - 1);

  // while not a valid location, step through the grid until we find one
  while (!isValidNewVirusLocation(grid, [vRow, vCol], colors)) {
    const next = nextGridCell([vRow, vCol], numRows, numCols);
    // stepped out the end of the grid, start over
    if (next === null) {
      return { cell: null, virus: null };
    }
    [vRow, vCol] = next;
  }

  // generate a color for the virus that is not in the nearby neighbors
  let colorSeed = remaining % (colors.length + 1);
  let color = colorSeed === colors.length ? (sample(colors) as GameColor) : colors[colorSeed];
  while (!isValidNewVirusColor(grid, [vRow, vCol], color)) {
    colorSeed = (colorSeed + 1) % (colors.length + 1);
    color = colorSeed === colors.length ? (sample(colors) as GameColor) : colors[colorSeed];
  }

  // done, return the virus and its location
  const cell: GridCellLocation = [vRow, vCol];
  const virus: GridObjectVirus = makeVirus(color);
  return { cell, virus };
}

export function minVirusRow(level: number): number {
  // offset by +1 to account for the extra "true" top row
  return MIN_VIRUS_ROW_TABLE[Math.min(level, MIN_VIRUS_ROW_TABLE.length - 1)] + 1;
}

export function nextGridCell(
  [rowI, colI]: GridCellLocation,
  numRows: number,
  numCols: number
): GridCellLocation | null {
  colI++;
  if (colI === numCols) {
    colI = 0;
    rowI++;
  }
  if (rowI === numRows) {
    return null;
  }
  return [rowI, colI];
}

export function isValidNewVirusLocation(
  grid: GameGrid<number, number>,
  [rowI, colI]: GridCellLocation,
  colors: OneOrMore<GameColor>,
  nearby?: MaybeGridObject[]
) {
  // cell must be empty
  if (!isEmpty(getInGrid(grid, [rowI, colI]))) {
    return false;
  }
  if (!nearby) {
    nearby = values(getCellNeighbors(grid, [rowI, colI], 2));
  }
  // location is valid if not all colors are present in the 4 nearby cells
  return !colors.every((color: GameColor) => {
    return (nearby as MaybeGridObject[]).some((obj: MaybeGridObject) => {
      return !!obj && hasColor(obj) && isColor(obj, color);
    });
  });
}

export function isValidNewVirusColor(
  grid: GameGrid<number, number>,
  [rowI, colI]: GridCellLocation,
  color: GameColor,
  nearby?: MaybeGridObject[]
) {
  if (!nearby) {
    nearby = values(getCellNeighbors(grid, [rowI, colI], 2));
  }
  // virus color is valid here if none of the nearby neighbors are the same color
  return !(nearby as MaybeGridObject[]).some((obj: MaybeGridObject) => {
    return !!obj && hasColor(obj) && isColor(obj, color);
  });
}
