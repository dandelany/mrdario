import { flatten } from "lodash";

import {
  Direction,
  GameGrid,
  GameGridRow,
  GridCellLocation,
  GridObject,
  GridObjectPillPart,
  GridObjectPillPartType,
  GridObjectType,
  MaybeGridObject,
  PillColors,
  PillLocation,
  RotateDirection
} from "../types";

import { makeDestroyed, makeEmpty, makePillLeft, makePillRight } from "./generators";
import {
  canMoveCell,
  deltaRowCol,
  findLines,
  findWidows,
  getCellNeighbors,
  getInGrid,
  isPillVertical,
  setInGrid,
  setPillPartFalling,
  setPillPartType
} from "./grid";
import {
  isDestroyed,
  isEmpty,
  isGridObject,
  isPillHalf,
  isPillLeft,
  isPillPart,
  isPillSegment,
  isPillTop,
  isVirus
} from "./guards";

// Pure functions which perform updates on the
// Immutable game grid/cell objects, returning the updated objects.
// These contain most of the central game logic.

export function givePill(grid: GameGrid<number, number>, pillColors: PillColors) {
  // add new pill to grid
  // added to row 1, because 0 is special "true" top row which is cleared every turn
  const rowI = 1;
  const row: GameGridRow<number> = grid[rowI];
  const colI: number = Math.floor(row.length / 2) - 1;
  const pill: PillLocation = [[rowI, colI], [rowI, colI + 1]];

  if (!pill.every(cell => isEmpty(getInGrid(grid, cell)))) {
    return { grid, pill, didGive: false };
  }

  grid = setInGrid(grid, pill[0], makePillLeft(pillColors[0].color));
  grid = setInGrid(grid, pill[1], makePillRight(pillColors[1].color));

  return { grid, pill, didGive: true };
}

export function moveCell(
  grid: GameGrid<number, number>,
  cell: GridCellLocation,
  direction: Direction
) {
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

    return { grid, cell: newCell, didMove: true };
  }
  return { grid, cell: newCell, didMove: false };
}

export function moveCells(
  grid: GameGrid<number, number>,
  cells: GridCellLocation[],
  direction: Direction
) {
  // move a set of cells (eg. a pill) at once
  // either they ALL move successfully, or none of them move
  const [dRow, dCol]: [number, number] = deltaRowCol(direction);

  const sortedCells: GridCellLocation[] = cells
    .slice()
    .sort((a: GridCellLocation, b: GridCellLocation) => {
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

export function movePill(grid: GameGrid<number, number>, pill: PillLocation, direction: Direction) {
  const moved = moveCells(grid, pill, direction);
  return { grid: moved.grid, pill: moved.cells as PillLocation, didMove: moved.didMove };
}

export function slamPill(grid: GameGrid<number, number>, pill: PillLocation) {
  // pressing "up" will "slam" the pill down
  // (ie. move it instantly to the lowest legal position directly below it)
  let moving = true;
  let didMove = false;
  while (moving) {
    const moved = movePill(grid, pill, Direction.Down);
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
  grid: GameGrid<number, number>,
  pill: PillLocation,
  rotateDirection: RotateDirection
) {
  // http://tetrisconcept.net/wiki/Dr._Mario#Rotation_system
  const pillNeighbors = [getCellNeighbors(grid, pill[0]), getCellNeighbors(grid, pill[1])];
  const isVertical = isPillVertical(grid, pill);
  const [pillRow, pillCol] = pill[0];
  const noMove = { grid, pill, didMove: false };

  // todo: guard to check these are really pill parts
  const pillParts = pill.map(([segRow, segCol]) =>
    getInGrid(grid, [segRow, segCol])
  ) as GridObjectPillPart[];

  type PillPartTypePair = [GridObjectPillPartType, GridObjectPillPartType];
  const nextPartTypes: PillPartTypePair = isVertical
    ? [GridObjectType.PillLeft, GridObjectType.PillRight]
    : [GridObjectType.PillTop, GridObjectType.PillBottom];

  if (isVertical) {
    // rotate vertical to horizontal
    if (isEmpty(pillNeighbors[1][Direction.Right])) {
      // empty space to the right
      const nextPill: PillLocation = [[pillRow + 1, pillCol], [pillRow + 1, pillCol + 1]];
      if (rotateDirection === RotateDirection.Clockwise) {
        grid = setInGrid(grid, nextPill[1], setPillPartType(pillParts[0], nextPartTypes[1]));
        grid = setInGrid(grid, nextPill[0], setPillPartType(pillParts[1], nextPartTypes[0]));
      } else {
        grid = setInGrid(grid, nextPill[0], setPillPartType(pillParts[0], nextPartTypes[0]));
        grid = setInGrid(grid, nextPill[1], setPillPartType(pillParts[1], nextPartTypes[1]));
      }
      grid = setInGrid(grid, [pillRow, pillCol], makeEmpty());
      pill = nextPill;
    } else {
      // no room on the right for normal rotate
      if (!isEmpty(pillNeighbors[1][Direction.Left])) {
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
      grid = setInGrid(grid, [pillRow, pillCol], makeEmpty());
      pill = nextPill;
      // return { grid, pill, didMove: true };
    }
  } else {
    // rotate horizontal to vertical

    if (!isEmpty(pillNeighbors[0][Direction.Up]) || pill[0][0] === 0) {
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
    grid = setInGrid(grid, [pillRow, pillCol + 1], makeEmpty());
    pill = nextPill;
  }
  return { grid, pill, didMove: true };
}

export function updateCellsWith(
  grid: GameGrid<number, number>,
  cells: GridCellLocation[],
  func: (grid: GameGrid<number, number>, cell: GridCellLocation) => GameGrid<number, number>
) {
  cells.forEach(cell => (grid = func(grid, cell)));
  return grid;
}

export function destroyCell(
  grid: GameGrid<number, number>,
  location: GridCellLocation
): GameGrid<number, number> {
  // set grid cell to destroyed
  return setInGrid(grid, location, makeDestroyed());
}
export function destroyCells(
  grid: GameGrid<number, number>,
  cells: GridCellLocation[]
): GameGrid<number, number> {
  return updateCellsWith(grid, cells, destroyCell);
}

export function removeCell(
  grid: GameGrid<number, number>,
  location: GridCellLocation
): GameGrid<number, number> {
  // set grid cell to empty
  return setInGrid(grid, location, makeEmpty());
}
export function removeCells(
  grid: GameGrid<number, number>,
  cells: GridCellLocation[]
): GameGrid<number, number> {
  return updateCellsWith(grid, cells, removeCell);
}

export function setPillSegment(
  grid: GameGrid<number, number>,
  location: GridCellLocation
): GameGrid<number, number> {
  // set grid cell to be a rounded pill segment (rather than half pill)
  const pillPart = getInGrid(grid, location);
  if (isPillHalf(pillPart)) {
    return setInGrid(grid, location, setPillPartType(pillPart, GridObjectType.PillSegment));
  }
  return grid;
}
export function setPillSegments(
  grid: GameGrid<number, number>,
  cells: GridCellLocation[]
): GameGrid<number, number> {
  return updateCellsWith(grid, cells, setPillSegment);
}

export function destroyLines(grid: GameGrid<number, number>, lines?: GridCellLocation[][]) {
  // find all valid lines of same color grid objects and set them to destroyed
  if (lines === undefined) {
    lines = findLines(grid);
  }
  const hasLines: boolean = !!(lines && lines.length);
  let destroyedCount: number = 0;
  let virusCount: number = 0;

  if (hasLines) {
    // count the number of destroyed viruses/cells (for score)
    for (const line of lines) {
      destroyedCount += line.length;
      for (const cell of line) {
        if (isVirus(getInGrid(grid, cell))) {
          virusCount++;
        }
      }
    }

    // set cells in lines to destroyed
    grid = destroyCells(grid, flatten(lines));
    // turn widowed pill halves into rounded 1-square pill segments
    grid = setPillSegments(grid, findWidows(grid));
  }

  return { grid, lines, hasLines, destroyedCount, virusCount };
}

export function removeDestroyed(grid: GameGrid<number, number>) {
  // find all "destroyed" objects in grid and set them to empty
  const destroyedCells: GridCellLocation[] = [];
  grid.forEach((row: GameGridRow<number>, rowI: number) =>
    row.forEach((cell: GridObject, colI) => {
      if (isDestroyed(cell)) {
        destroyedCells.push([rowI, colI]);
      }
    })
  );
  return removeCells(grid, destroyedCells);
}

// find pieces in the grid which are unsupported and should fall in cascade
export function dropDebris(grid: GameGrid<number, number>) {
  // start at the bottom of the grid and move up,
  // seeing which pieces can fall
  const fallingCells: GridCellLocation[] = [];

  for (let rowI = grid.length - 2; rowI >= 0; rowI--) {
    const row: GameGridRow<number> = grid[rowI];
    for (let colI = 0; colI < row.length; colI++) {
      const obj = getInGrid(grid, [rowI, colI]);
      let didMove = false;

      if (isPillSegment(obj)) {
        ({ grid, didMove } = moveCell(grid, [rowI, colI], Direction.Down));
        if (didMove) {
          fallingCells.push([rowI, colI]);
        }
      } else if (isPillLeft(obj)) {
        ({ grid, didMove } = moveCells(grid, [[rowI, colI], [rowI, colI + 1]], Direction.Down));
        if (didMove) {
          fallingCells.push([rowI, colI], [rowI, colI + 1]);
        }
      } else if (isPillTop(obj)) {
        ({ grid, didMove } = moveCells(grid, [[rowI, colI], [rowI + 1, colI]], Direction.Down));
        if (didMove) {
          fallingCells.push([rowI, colI], [rowI + 1, colI]);
        }
      }
    }
  }
  return { grid, fallingCells };
}

export function flagFallingCells(grid: GameGrid<number, number>) {
  // find cells in the grid which are falling and set 'isFalling' flag on them, without actually dropping them
  // todo refactor, do we really need to do this
  // findLines should be able to detect which cells are falling so no need for this?
  const dropped = dropDebris(grid); // check if there is debris to drop

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
    const row: GameGridRow<number> = grid[rowIndex];
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const obj: GridObject = row[colIndex];
      if (isPillPart(obj) && obj.isFalling) {
        grid = setInGrid(grid, [rowIndex, colIndex], setPillPartFalling(obj, false));
      }
    }
  }

  dropped.fallingCells.forEach((cell: GridCellLocation) => {
    const gridObject: MaybeGridObject = getInGrid(grid, cell);
    if (isPillPart(gridObject)) {
      setInGrid(grid, cell, setPillPartFalling(gridObject, true));
    }
  });

  return { grid, fallingCells: dropped.fallingCells };
}

export function clearTopRow(grid: GameGrid<number, number>) {
  // clear all cells in the top row
  const cellsInTopRow: GridCellLocation[] = grid[0].map(
    (_col, colI: number): GridCellLocation => [0, colI]
  );
  grid = removeCells(grid, cellsInTopRow);

  // turn remaining widowed pill halves into rounded 1-square pill segments
  grid = setPillSegments(grid, findWidows(grid));

  return grid;
}