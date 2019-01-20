import { flatten, get, isUndefined } from "lodash";

import { GridObjectType } from "../constants";

import {
  canMoveCell,
  deltaRowCol,
  findLines,
  findWidows,
  getCellNeighbors,
  getInGrid,
  isDestroyed,
  isEmpty,
  isPillLeft,
  isPillSegment,
  isPillTop,
  isPillVertical,
  isVirus
} from "./grid";

import { makeDestroyed, makeEmpty, makePillLeft, makePillRight } from "./generators";
import { Direction, GameGrid, GameGridRow, GridCellLocation, GridPillLocation, RotateDirection } from "../types";

// Pure functions which perform updates on the
// Immutable game grid/cell objects, returning the updated objects.
// These contain most of the central game logic.

export function givePill(grid: GameGrid<number, number>, pillColors) {
  // add new pill to grid
  // added to row 1, because 0 is special "true" top row which is cleared every turn
  const rowI = 1;
  let row: GameGridRow<number> = grid[rowI];
  const colI: number = Math.floor(row.length / 2) - 1;
  const pill: GridCellLocation[] = [[rowI, colI], [rowI, colI + 1]];

  if (!pill.every(cell => isEmpty(getInGrid(grid, cell)))) return { grid, pill, didGive: false };

  grid = grid.setIn(pill[0], makePillLeft(get(pillColors, "0.color")));
  grid = grid.setIn(pill[1], makePillRight(get(pillColors, "1.color")));

  return { grid, pill, didGive: true };
}

export function moveCell(
  grid: GameGrid<number, number>,
  cell: GridCellLocation,
  direction: Direction
) {
  if (!canMoveCell(grid, cell, direction)) return { grid, cell, didMove: false };
  const [dRow, dCol] = deltaRowCol(direction);
  const [rowI, colI] = cell;
  const newCell = [rowI + dRow, colI + dCol];

  grid = grid.setIn(newCell, grid.getIn(cell));
  grid = grid.setIn(cell, makeEmpty());
  cell = [rowI + dRow, colI + dCol];
  return { grid, cell, didMove: true };
}

export function moveCells(
  grid: GameGrid<number, number>,
  cells: GridCellLocation[],
  direction: Direction
) {
  // move a set of cells (eg. a pill) at once
  // either they ALL move successfully, or none of them move
  const [dRow, dCol]: [number, number] = deltaRowCol(direction);

  let sortedCells: GridCellLocation[] = cells
    .slice()
    .sort((a: GridCellLocation, b: GridCellLocation) => {
      // sort the cells, so when moving eg. down, the furthest cell down moves first
      // this way we don't overwrite newly moved elements
      return Math.abs(dRow) > 0 ? (b[0] - a[0]) * dRow : (b[1] - a[1]) * dCol;
    });
  const oldGrid = grid;

  for (var i = 0; i < sortedCells.length; i++) {
    let cell: GridCellLocation = sortedCells[i];
    let moved = moveCell(grid, cell, direction);
    // move unsuccessful, return original grid
    if (!moved.didMove) return { grid: oldGrid, cells, didMove: false };
    // move successful
    grid = moved.grid;
  }
  // all moves successful, update (unsorted) cells with new locations
  cells = cells.map(([rowI, colI]: GridCellLocation): GridCellLocation => {
    return [rowI + dRow, colI + dCol];
  });
  return { grid, cells, didMove: true };
}


export function movePill(grid: GameGrid<number, number>, pill: GridPillLocation, direction: Direction) {
  const moved = moveCells(grid, pill, direction);
  return { grid: moved.grid, pill: moved.cells as GridPillLocation, didMove: moved.didMove };
}

export function slamPill(grid: GameGrid<number, number>, pill: GridPillLocation) {
  // pressing "up" will "slam" the pill down
  // (ie. move it instantly to the lowest legal position directly below it)
  let moving = true;
  let didMove = false;
  while (moving) {
    const moved = movePill(grid, pill, Direction.Down);
    grid = moved.grid;
    pill = moved.pill;
    moving = moved.didMove;
    if (moving) didMove = true;
  }
  return { grid, pill, didMove };
}

export function rotatePill(grid: GameGrid<number, number>, pill: GridPillLocation, rotateDirection: RotateDirection) {
  // http://tetrisconcept.net/wiki/Dr._Mario#Rotation_system
  const pillNeighbors = [getCellNeighbors(grid, pill[0]), getCellNeighbors(grid, pill[1])];
  const isVertical = isPillVertical(grid, pill);
  const [pillRow, pillCol] = pill[0];
  const noMove = { grid, pill, didMove: false };

  const pillParts = pill.map(([segRow, segCol]) => getInGrid(grid, [segRow, segCol]));
  const newPartTypes = isVertical
    ? [GridObjectType.PillLeft, GridObjectType.PillRight]
    : [GridObjectType.PillTop, GridObjectType.PillBottom];

  if (isVertical) {
    // rotate vertical to horizontal

    if (isEmpty(pillNeighbors[1][Direction.Right])) {
      // empty space to the right
      if (rotateDirection === RotateDirection.Clockwise) {
        grid = grid.setIn([pillRow + 1, pillCol], pillParts[1].set("type", newPartTypes[0]));
        grid = grid.setIn([pillRow + 1, pillCol + 1], pillParts[0].set("type", newPartTypes[1]));
      } else {
        grid = grid.setIn([pillRow + 1, pillCol], pillParts[0].set("type", newPartTypes[0]));
        grid = grid.setIn([pillRow + 1, pillCol + 1], pillParts[1].set("type", newPartTypes[1]));
      }
      grid = grid.setIn([pillRow, pillCol], makeEmpty());
      pill = [[pillRow + 1, pillCol], [pillRow + 1, pillCol + 1]];
    } else {
      // no room on the right for normal rotate
      if (!isEmpty(pillNeighbors[1][Direction.Left]))
        // no rotate, stuck between blocks
        return noMove;

      // there is room to the left, but not the right - so "kick" the pill to the left
      const newPill = [[pillRow + 1, pillCol - 1], [pillRow + 1, pillCol]];
      if (rotateDirection === RotateDirection.Clockwise) {
        grid = grid.setIn(newPill[0], pillParts[1].set("type", newPartTypes[0]));
        grid = grid.setIn(newPill[1], pillParts[0].set("type", newPartTypes[1]));
      } else {
        grid = grid.setIn(newPill[0], pillParts[0].set("type", newPartTypes[0]));
        grid = grid.setIn(newPill[1], pillParts[1].set("type", newPartTypes[1]));
      }
      grid = grid.setIn([pillRow, pillCol], makeEmpty());
      pill = newPill;
      return { grid, pill, didMove: true };
    }
  } else {
    // rotate horizontal to vertical

    if (!isEmpty(pillNeighbors[0][Direction.Up]) || pill[0][0] === 0) return noMove; // no kick here

    if (rotateDirection === RotateDirection.Clockwise) {
      grid = grid.setIn([pillRow - 1, pillCol], pillParts[0].set("type", newPartTypes[0]));
      grid = grid.setIn([pillRow, pillCol], pillParts[1].set("type", newPartTypes[1]));
    } else {
      grid = grid.setIn([pillRow - 1, pillCol], pillParts[1].set("type", newPartTypes[0]));
      grid = grid.setIn([pillRow, pillCol], pillParts[0].set("type", newPartTypes[1]));
    }
    grid = grid.setIn([pillRow, pillCol + 1], makeEmpty());
    pill = [[pillRow - 1, pillCol], [pillRow, pillCol]];
  }
  return { grid, pill, didMove: true };
}

export function updateCellsWith(grid, cells, func) {
  cells.forEach(cell => (grid = func(grid, cell)));
  return grid;
}

export function destroyCell(grid, [rowI, colI]) {
  // set grid cell to destroyed
  return grid.setIn([rowI, colI], makeDestroyed());
}
export const destroyCells = (grid, cells) => updateCellsWith(grid, cells, destroyCell);

export function removeCell(grid, [rowI, colI]) {
  // set grid cell to empty
  return grid.setIn([rowI, colI], makeEmpty());
}
export const removeCells = (grid, cells) => updateCellsWith(grid, cells, removeCell);

export function setPillSegment(grid, [rowI, colI]) {
  // set grid cell to be a rounded pill segment (rather than half pill)
  grid = grid.mergeIn([rowI, colI], { type: GridObject.PillSegment });
  return grid;
}
export const setPillSegments = (grid, cells) => updateCellsWith(grid, cells, setPillSegment);

export function destroyLines(grid, lines) {
  // find all valid lines of same color grid objects and set them to destroyed
  if (isUndefined(lines)) lines = findLines(grid);
  const hasLines = !!(lines && lines.length);
  let destroyedCount = 0;
  let virusCount = 0;

  if (hasLines) {
    // count the number of destroyed viruses/cells (for score)
    for (const line of lines) {
      destroyedCount += line.length;
      for (const cell of line) {
        if (isVirus(grid.getIn(cell))) virusCount++;
      }
    }

    // set cells in lines to destroyed
    grid = destroyCells(grid, flatten(lines));
    // turn widowed pill halves into rounded 1-square pill segments
    grid = setPillSegments(grid, findWidows(grid));
  }

  return { grid, lines, hasLines, destroyedCount, virusCount };
}

export function removeDestroyed(grid) {
  // find all "destroyed" objects in grid and set them to empty
  let destroyedCells = [];
  grid.forEach((row, rowI) =>
    row.forEach((cell, colI) => {
      if (isDestroyed(grid.getIn([rowI, colI]))) destroyedCells.push([rowI, colI]);
    })
  );
  return removeCells(grid, destroyedCells);
}

// find pieces in the grid which are unsupported and should fall in cascade
export function dropDebris(grid) {
  // start at the bottom of the grid and move up,
  // seeing which pieces can fall
  let fallingCells = [];

  for (var rowI = grid.size - 2; rowI >= 0; rowI--) {
    const row = grid.get(rowI);
    for (var colI = 0; colI < row.size; colI++) {
      const obj = grid.getIn([rowI, colI]);
      let didMove = false;

      if (isPillSegment(obj)) {
        ({ grid, didMove } = moveCell(grid, [rowI, colI], "down"));
        if (didMove) fallingCells.push([rowI, colI]);
      } else if (isPillLeft(obj)) {
        ({ grid, didMove } = moveCells(grid, [[rowI, colI], [rowI, colI + 1]], "down"));
        if (didMove) fallingCells.push([rowI, colI], [rowI, colI + 1]);
      } else if (isPillTop(obj)) {
        ({ grid, didMove } = moveCells(grid, [[rowI, colI], [rowI + 1, colI]], "down"));
        if (didMove) fallingCells.push([rowI, colI], [rowI + 1, colI]);
      }
    }
  }
  return { grid, fallingCells };
}

export function flagFallingCells(grid) {
  // find cells in the grid which are falling and set 'isFalling' flag on them, without actually dropping them
  // todo refactor, do we really need to do this
  // findLines should be able to detect which cells are falling so no need for this?
  const dropped = dropDebris(grid); // check if there is debris to drop
  grid = grid.map(row => row.map(cell => cell.set("isFalling", false)));
  dropped.fallingCells.forEach(cell => (grid = grid.setIn(cell.concat(["isFalling"]), true)));
  return { grid, fallingCells: dropped.fallingCells };
}

export function clearTopRow(grid) {
  // clear all cells in the top row
  const row = grid.get(0);
  const cells = row.map((col, colI) => [0, colI]);
  grid = removeCells(grid, cells);

  // turn remaining widowed pill halves into rounded 1-square pill segments
  grid = setPillSegments(grid, findWidows(grid));

  return grid;
}
