import { times, values } from "lodash";

import {
  GameColor,
  GameGrid,
  GameGridRow,
  GridCellLocation,
  GridObject,
  GridObjectDestroyed,
  GridObjectEmpty,
  GridObjectPillLeft,
  GridObjectPillRight, GridObjectPillSegment,
  GridObjectType,
  GridObjectVirus,
  MaybeGridObject,
  OneOrMore,
  PillColors
} from "../types";

import { MIN_VIRUS_ROW_TABLE, VIRUS_COUNT_TABLE } from "../constants";
import { getCellNeighbors, getInGrid } from "./grid";
import { hasColor, isColor, isEmpty } from "./guards";
import { seedRandomColor, seedRandomInt } from "./random";
import { setInGrid } from "./setters";

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
export function makePillSegment(color: GameColor): GridObjectPillSegment {
  return { type: GridObjectType.PillSegment, color };
}

export function makeEmptyGridRow(width: number): GameGridRow {
  return times<GridObject>(width, makeEmpty) as GameGridRow;
}
export function makeEmptyGrid(width: number, height: number): GameGrid {
  return times<GameGridRow>(height, () => {
    return makeEmptyGridRow(width);
  }) as GameGrid;
}

export function getNextPill(seed: string, pillCount: number): PillColors {
  // get seeded random number generators for the two colors
  const color1 = seedRandomColor(`"${seed}"-${pillCount}-0-nextPill`);
  const color2 = seedRandomColor(`"${seed}"-${pillCount}-1-nextPill`);

  return [color1, color2];
}

export function getLevelVirusCount(level: number): number {
  return VIRUS_COUNT_TABLE[Math.min(level, VIRUS_COUNT_TABLE.length - 1)];
}

export function generateEnemies(grid: GameGrid, level: number, colors: OneOrMore<GameColor>, seed: string) {
  // generate random enemies in a (empty) grid
  // inspired by http://tetrisconcept.net/wiki/Dr._Mario#Virus_Generation
  let virusCount = getLevelVirusCount(level);
  const origVirusCount = virusCount;

  let virusSeed = 0;
  while (virusCount) {
    const { cell, virus } = generateVirus(grid, level, colors, virusCount, seed + virusSeed);
    virusSeed++;
    if (!virus || !cell) {
      continue;
    } // bad virus, try again
    grid = setInGrid(grid, cell, virus); // good virus, put it in the cell
    virusCount--;
  }

  return { grid, virusCount: origVirusCount };
}

export function generateVirus(
  grid: GameGrid,
  level: number,
  colors: OneOrMore<GameColor>,
  remaining: number,
  seed: string
) {
  const numRows = grid.length;
  const numCols = grid[0].length;
  // initial candidate row and column for our virus
  const baseSeed = `genVirus-${seed}-${level}-${remaining}`;
  let vRow = seedRandomInt(baseSeed + "row", minVirusRow(level), numRows - 1);
  let vCol = seedRandomInt(baseSeed + "col", 0, numCols - 1);

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
  let color = colorSeed === colors.length ? seedRandomColor(baseSeed + "color") : colors[colorSeed];
  while (!isValidNewVirusColor(grid, [vRow, vCol], color)) {
    colorSeed = colorSeed + 1;
    color =
      (colorSeed % colors.length) + 1 === colors.length
        ? seedRandomColor(baseSeed + "color" + colorSeed)
        : colors[(colorSeed % colors.length) + 1];
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
  grid: GameGrid,
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
  grid: GameGrid,
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
