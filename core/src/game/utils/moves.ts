import { flatten, uniqBy } from "lodash";

import {
  GameGrid,
  GameGridRow,
  GridCellLocation,
  GridDirection,
  GridObject,
  GridObjectPillPart,
  GridObjectPillPartType,
  GridObjectType,
  PillColors,
  PillLocation,
  RotateDirection
} from "../types";

import { makeEmpty, makePillLeft, makePillRight } from "./generators";
import {
  canMoveCell,
  deltaRowCol,
  findLines,
  findWidows,
  getCellNeighbors,
  getInGrid,
  isPillVertical
} from "./grid";
import { isDestroyed, isEmpty, isGridObject, isPillLeft, isPillSegment, isPillTop, isVirus } from "./guards";
import {
  destroyCells,
  removeCell,
  removeCells,
  setInGrid,
  setPillPartType,
  setPillSegments
} from "./setters";

// Pure functions which perform updates on the
// Immutable game grid/cell objects, returning the updated objects.
// These contain most of the central game logic.

type PillPartTypePair = [GridObjectPillPartType, GridObjectPillPartType];

interface GridResult {
  grid: GameGrid;
}
export interface GivePillResult extends GridResult {
  pill: PillLocation;
  didGive: boolean;
}
export interface GridMoveResult extends GridResult {
  didMove: boolean;
}
export interface MoveCellResult extends GridMoveResult {
  cell: GridCellLocation;
}
export interface MoveCellsResult extends GridMoveResult {
  cells: GridCellLocation[];
}
export interface MovePillResult extends GridMoveResult {
  pill: PillLocation;
}
export interface DestroyLinesResult extends GridResult {
  lines: any;
  hasLines: boolean;
  destroyedCount: number;
  virusCount: number;
}
export interface DropDebrisResult extends GridResult {
  fallingCells: GridCellLocation[];
}

export function givePill(grid: GameGrid, pillColors: PillColors): GivePillResult {
  // add new pill to grid
  // added to row 1, because 0 is special "true" top row which is cleared every turn
  const rowI = 1;
  const row: GameGridRow = grid[rowI];
  const colI: number = Math.floor(row.length / 2) - 1;
  const pill: PillLocation = [[rowI, colI], [rowI, colI + 1]];

  if (!pill.every(cell => isEmpty(getInGrid(grid, cell)))) {
    return { grid, pill, didGive: false };
  }

  grid = setInGrid(grid, pill[0], makePillLeft(pillColors[0]));
  grid = setInGrid(grid, pill[1], makePillRight(pillColors[1]));

  return { grid, pill, didGive: true };
}

export function moveCell(grid: GameGrid, cell: GridCellLocation, direction: GridDirection): MoveCellResult {
  if (!canMoveCell(grid, cell, direction)) {
    return { grid, cell, didMove: false };
  }
  const [dRow, dCol] = deltaRowCol(direction);
  const [rowI, colI] = cell;
  const newCell: GridCellLocation = [rowI + dRow, colI + dCol];

  const objToMove = getInGrid(grid, cell);
  const objToReplace = getInGrid(grid, newCell);
  if (isGridObject(objToMove) && isGridObject(objToReplace)) {
    grid = setInGrid(grid, newCell, objToMove);
    grid = setInGrid(grid, cell, makeEmpty());
    grid = removeCell(grid, cell);

    return { grid, cell: newCell, didMove: true };
  }
  return { grid, cell: newCell, didMove: false };
}

export function moveCells(
  grid: GameGrid,
  cells: GridCellLocation[],
  direction: GridDirection
): MoveCellsResult {
  // move a set of cells (eg. a pill) at once
  // either they ALL move successfully, or none of them move
  const [dRow, dCol]: [number, number] = deltaRowCol(direction);

  const sortedCells: GridCellLocation[] = cells.slice().sort((a: GridCellLocation, b: GridCellLocation) => {
    // sort the cells, so when moving eg. down, the furthest cell down moves first
    // this way we don't overwrite newly moved elements
    return Math.abs(dRow) > 0 ? (b[0] - a[0]) * dRow : (b[1] - a[1]) * dCol;
  });
  const oldGrid = grid;

  for (const cell of sortedCells) {
    const moved = moveCell(grid, cell, direction);
    // move unsuccessful, return original grid
    if (!moved.didMove) {
      return { grid: oldGrid, cells, didMove: false };
    }
    // move successful
    grid = moved.grid;
  }
  // all moves successful, update (unsorted) cells with new locations
  cells = cells.map(
    ([rowI, colI]: GridCellLocation): GridCellLocation => {
      return [rowI + dRow, colI + dCol];
    }
  );
  return { grid, cells, didMove: true };
}

export function movePill(grid: GameGrid, pill: PillLocation, direction: GridDirection): MovePillResult {
  const moved = moveCells(grid, pill, direction);
  return {
    grid: moved.grid,
    pill: moved.cells as PillLocation,
    didMove: moved.didMove
  };
}

export function slamPill(grid: GameGrid, pill: PillLocation): MovePillResult {
  // pressing "up" will "slam" the pill down
  // (ie. move it instantly to the lowest legal position directly below it)
  let moving = true;
  let didMove = false;
  while (moving) {
    const moved = movePill(grid, pill, GridDirection.Down);
    grid = moved.grid;
    pill = moved.pill;
    moving = moved.didMove;
    if (moving) {
      didMove = true;
    }
  }
  return { grid, pill, didMove };
}

export function rotatePill(
  grid: GameGrid,
  pill: PillLocation,
  rotateDirection: RotateDirection
): MovePillResult {
  // http://tetrisconcept.net/wiki/Dr._Mario#Rotation_system
  const pillNeighbors = [getCellNeighbors(grid, pill[0]), getCellNeighbors(grid, pill[1])];
  const isVertical = isPillVertical(grid, pill);
  const [pillRow, pillCol] = pill[0];
  const noMove = { grid, pill, didMove: false };

  // todo: guard to check these are really pill parts
  const pillParts = pill.map(([segRow, segCol]) => getInGrid(grid, [segRow, segCol])) as GridObjectPillPart[];

  const nextPartTypes: PillPartTypePair = isVertical
    ? [GridObjectType.PillLeft, GridObjectType.PillRight]
    : [GridObjectType.PillTop, GridObjectType.PillBottom];

  if (isVertical) {
    // rotate vertical to horizontal
    if (isEmpty(pillNeighbors[1][GridDirection.Right])) {
      // empty space to the right
      const nextPill: PillLocation = [[pillRow + 1, pillCol], [pillRow + 1, pillCol + 1]];
      if (rotateDirection === RotateDirection.Clockwise) {
        grid = setInGrid(grid, nextPill[1], setPillPartType(pillParts[0], nextPartTypes[1]));
        grid = setInGrid(grid, nextPill[0], setPillPartType(pillParts[1], nextPartTypes[0]));
      } else {
        grid = setInGrid(grid, nextPill[0], setPillPartType(pillParts[0], nextPartTypes[0]));
        grid = setInGrid(grid, nextPill[1], setPillPartType(pillParts[1], nextPartTypes[1]));
      }
      grid = removeCell(grid, [pillRow, pillCol]);
      pill = nextPill;
    } else {
      // no room on the right for normal rotate
      if (!isEmpty(pillNeighbors[1][GridDirection.Left])) {
        // no rotate, stuck between blocks
        return noMove;
      }

      // there is room to the left, but not the right - so "kick" the pill to the left
      const nextPill: PillLocation = [[pillRow + 1, pillCol - 1], [pillRow + 1, pillCol]];
      if (rotateDirection === RotateDirection.Clockwise) {
        grid = setInGrid(grid, nextPill[0], setPillPartType(pillParts[1], nextPartTypes[0]));
        grid = setInGrid(grid, nextPill[1], setPillPartType(pillParts[0], nextPartTypes[1]));
      } else {
        grid = setInGrid(grid, nextPill[0], setPillPartType(pillParts[0], nextPartTypes[0]));
        grid = setInGrid(grid, nextPill[1], setPillPartType(pillParts[1], nextPartTypes[1]));
      }
      grid = removeCell(grid, [pillRow, pillCol]);
      pill = nextPill;
      // return { grid, pill, didMove: true };
    }
  } else {
    // rotate horizontal to vertical

    if (!isEmpty(pillNeighbors[0][GridDirection.Up]) || pill[0][0] === 0) {
      return noMove;
    } // no kick here

    const nextPill: PillLocation = [[pillRow - 1, pillCol], [pillRow, pillCol]];
    if (rotateDirection === RotateDirection.Clockwise) {
      grid = setInGrid(grid, nextPill[0], setPillPartType(pillParts[0], nextPartTypes[0]));
      grid = setInGrid(grid, nextPill[1], setPillPartType(pillParts[1], nextPartTypes[1]));
    } else {
      grid = setInGrid(grid, nextPill[0], setPillPartType(pillParts[1], nextPartTypes[0]));
      grid = setInGrid(grid, nextPill[1], setPillPartType(pillParts[0], nextPartTypes[1]));
    }
    grid = removeCell(grid, [pillRow, pillCol + 1]);
    pill = nextPill;
  }
  // todo implement kick down?
  return { grid, pill, didMove: true };
}

export function destroyLines(grid: GameGrid, lines?: GridCellLocation[][]): DestroyLinesResult {
  // objects which are still falling do not contribute to lines
  // use dropDebris to find the cells which are falling
  const { fallingCells } = dropDebris(grid);
  // make a temp grid with falling objects removed, to exclude them from line checking
  let tempGrid: GameGrid = grid;
  if (fallingCells.length) {
    for (const cell of fallingCells) {
      tempGrid = removeCell(tempGrid, cell);
    }
  }
  // find all valid lines of same-color objects in the temp grid
  if (lines === undefined) {
    lines = findLines(tempGrid);
  }
  const hasLines: boolean = !!(lines && lines.length);
  let destroyedCount: number = 0;
  let virusCount: number = 0;

  if (hasLines) {
    const lineCells: GridCellLocation[] = flatten(lines);
    // get unique cells, since lines may overlap
    const uniqLineCells = uniqBy(lineCells, c => `${c[0]},${c[1]}`);
    // count the number of destroyed viruses/cells (for score)
    destroyedCount = uniqLineCells.length;
    virusCount = uniqLineCells.filter((cell: GridCellLocation) => {
      return isVirus(getInGrid(grid, cell));
    }).length;
    // set cells in lines to destroyed
    grid = destroyCells(grid, uniqLineCells);
    // turn widowed pill halves into rounded 1-square pill segments
    grid = setPillSegments(grid, findWidows(grid));
  }

  return { grid, lines, hasLines, destroyedCount, virusCount };
}

export function removeDestroyed(grid: GameGrid): GameGrid {
  // find all "destroyed" objects in grid and set them to empty
  const destroyedCells: GridCellLocation[] = [];
  grid.forEach((row: GameGridRow, rowI: number) =>
    row.forEach((cell: GridObject, colI) => {
      if (isDestroyed(cell)) {
        destroyedCells.push([rowI, colI]);
      }
    })
  );
  return removeCells(grid, destroyedCells);
}

export function dropDebris(grid: GameGrid): DropDebrisResult {
  // find pieces in the grid which are unsupported and should fall in cascade
  // start at the bottom of the grid and move up,
  // seeing which pieces can fall
  const fallingCells: GridCellLocation[] = [];

  for (let rowI = grid.length - 2; rowI >= 0; rowI--) {
    const row: GameGridRow = grid[rowI];
    for (let colI = 0; colI < row.length; colI++) {
      const obj = getInGrid(grid, [rowI, colI]);
      let didMove = false;

      if (isPillSegment(obj)) {
        ({ grid, didMove } = moveCell(grid, [rowI, colI], GridDirection.Down));
        if (didMove) {
          fallingCells.push([rowI, colI]);
        }
      } else if (isPillLeft(obj)) {
        ({ grid, didMove } = moveCells(grid, [[rowI, colI], [rowI, colI + 1]], GridDirection.Down));
        if (didMove) {
          fallingCells.push([rowI, colI], [rowI, colI + 1]);
        }
      } else if (isPillTop(obj)) {
        ({ grid, didMove } = moveCells(grid, [[rowI, colI], [rowI + 1, colI]], GridDirection.Down));
        if (didMove) {
          fallingCells.push([rowI, colI], [rowI + 1, colI]);
        }
      }
    }
  }
  return { grid, fallingCells };
}

export function clearTopRow(grid: GameGrid): GameGrid {
  // clear all cells in the top row
  const cellsInTopRow: GridCellLocation[] = grid[0].map((_col, colI: number): GridCellLocation => [0, colI]);
  grid = removeCells(grid, cellsInTopRow);

  // turn remaining widowed pill halves into rounded 1-square pill segments
  grid = setPillSegments(grid, findWidows(grid));

  return grid;
}
