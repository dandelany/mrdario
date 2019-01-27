// functions which update the grid

import { produce } from "immer";
import {
  GameGrid,
  GameGridRow,
  GridCellLocation,
  GridObject,
  GridObjectPillPart,
  GridObjectPillPartType,
  GridObjectType
} from "../types";
import { makeDestroyed, makeEmpty } from "./generators";
import { getInGrid } from "./grid";
import { isPillHalf } from "./guards";

// simple setter functions which update the Grid (or a GridObject)
// all are immutable & return a new object, leaving the original intact

export function setInGrid(grid: GameGrid, location: GridCellLocation, value: GridObject): GameGrid {
  const [rowIndex, colIndex] = location;
  if (rowIndex >= grid.length || rowIndex < 0) {
    return grid;
  }
  const row = grid[rowIndex];
  if (colIndex >= row.length || colIndex < 0) {
    return grid;
  }
  return produce(grid, (draftGrid: GameGrid) => {
    draftGrid[rowIndex][colIndex] = value;
  });
}

export function setInRow(row: GameGridRow, colIndex: number, value: GridObject): GameGridRow {
  if (colIndex >= row.length || colIndex < 0) {
    return row;
  }
  return produce(row, (draftRow: GameGridRow) => {
    draftRow[colIndex] = value;
  });
}

export function updateCellsWith(
  grid: GameGrid,
  cells: GridCellLocation[],
  func: (grid: GameGrid, cell: GridCellLocation) => GameGrid
) {
  cells.forEach(cell => (grid = func(grid, cell)));
  return grid;
}

export function destroyCell(grid: GameGrid, location: GridCellLocation): GameGrid {
  // set grid cell to destroyed
  return setInGrid(grid, location, makeDestroyed());
}
export function destroyCells(grid: GameGrid, cells: GridCellLocation[]): GameGrid {
  return updateCellsWith(grid, cells, destroyCell);
}

export function removeCell(grid: GameGrid, location: GridCellLocation): GameGrid {
  // set grid cell to empty
  return setInGrid(grid, location, makeEmpty());
}
export function removeCells(grid: GameGrid, cells: GridCellLocation[]): GameGrid {
  return updateCellsWith(grid, cells, removeCell);
}

export function setPillSegment(grid: GameGrid, location: GridCellLocation): GameGrid {
  // set grid cell to be a rounded pill segment (rather than half pill)
  const pillPart = getInGrid(grid, location);
  if (isPillHalf(pillPart)) {
    return setInGrid(grid, location, setPillPartType(pillPart, GridObjectType.PillSegment));
  }
  return grid;
}
export function setPillSegments(grid: GameGrid, cells: GridCellLocation[]): GameGrid {
  return updateCellsWith(grid, cells, setPillSegment);
}

export function setPillPartType(obj: GridObjectPillPart, type: GridObjectPillPartType) {
  return produce(obj, draftObj => {
    draftObj.type = type;
  });
}
export function setPillPartFalling(obj: GridObjectPillPart, isFalling: boolean) {
  return produce(obj, (draftObj: GridObjectPillPart) => {
    draftObj.isFalling = isFalling;
  });
}
