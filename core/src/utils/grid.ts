import { produce } from "immer";
import { flatten, range } from "lodash";

import {
  Direction,
  GameColor,
  GameGrid,
  GameGridRow,
  GridCellLocation,
  GridCellLocationDelta,
  GridCellNeighbors,
  GridObject,
  GridObjectPillPart,
  GridObjectPillPartType,
  MaybeGridObject
} from "../types";

import {
  hasColor,
  isEmpty,
  isPillBottom,
  isPillHalf,
  isPillLeft,
  isPillRight,
  isPillTop,
  isVirus
} from "./guards";

// these are pure stateless functions which contain the majority of the game logic
// they use Immutable objects to represent the grid and return new objects on 'mutation'

export function getInRow(row: GameGridRow, colIndex: number): MaybeGridObject {
  if (colIndex >= row.length || colIndex < 0) {
    return null;
  }
  return row[colIndex];
}

export function getInGrid(
  grid: GameGrid,
  location: GridCellLocation
): MaybeGridObject {
  const [rowIndex, colIndex] = location;
  if (rowIndex >= grid.length || rowIndex < 0) {
    return null;
  }
  return getInRow(grid[rowIndex], colIndex);
}

export function setInRow(
  row: GameGridRow,
  colIndex: number,
  value: GridObject
): GameGridRow {
  if (colIndex >= row.length || colIndex < 0) {
    return row;
  }
  return produce(row, (draftRow: GameGridRow) => {
    draftRow[colIndex] = value;
  });
}

export function setInGrid(
  grid: GameGrid,
  location: GridCellLocation,
  value: GridObject
): GameGrid {
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

export function hasViruses(grid: GameGrid): boolean {
  return !grid.every(row => row.every(cell => !isVirus(cell)));
}

export function isPillVertical(grid: GameGrid, pillCells: GridCellLocation[]) {
  return isPillTop(getInGrid(grid, pillCells[0]));
}

export function getCellNeighbors(
  grid: GameGrid,
  location: GridCellLocation,
  distance = 1
): GridCellNeighbors {
  const [rowIndex, colIndex] = location;
  // returns the neighbors of the grid cell at [rowIndex, colIndex]
  // some may be undefined if out of bounds
  return {
    [Direction.Up]: getInGrid(grid, [rowIndex - distance, colIndex]),
    [Direction.Down]: getInGrid(grid, [rowIndex + distance, colIndex]),
    [Direction.Left]: getInGrid(grid, [rowIndex, colIndex - distance]),
    [Direction.Right]: getInGrid(grid, [rowIndex, colIndex + distance])
  };
}

export function canMoveCell(
  grid: GameGrid,
  location: GridCellLocation,
  direction: Direction
) {
  return isEmpty(getCellNeighbors(grid, location)[direction]);
}

export function deltaRowCol(direction: Direction, distance: number = 1): GridCellLocationDelta {
  // create the [dRow, dCol] needed for a move in given direction and distance eg. up 1 is [-1, 0]
  const dRow = direction === Direction.Down ? distance : direction === Direction.Up ? -distance : 0;
  const dCol =
    direction === Direction.Right ? distance : direction === Direction.Left ? -distance : 0;
  if (Math.abs(dRow) + Math.abs(dCol) === 0) {
    throw new Error("invalid direction " + direction);
  }
  return [dRow, dCol];
}

// find same-color lines within a single row or column
export function findLinesIn(
  row: GameGridRow,
  lineLength = 4,
  excludeFlag = "isFalling"
): number[][] {
  let lastColor: GameColor | undefined;
  let curLine: number[] = [];

  return row.reduce((result: number[][], obj: GridObject, colIndex: number) => {
    let color: GameColor | undefined;
    if (hasColor(obj)) {
      color = obj.color;
    }

    const shouldExclude = excludeFlag && !!obj[excludeFlag];
    if (colIndex > 0 && (color !== lastColor || shouldExclude)) {
      // different color, end the current line and add to result if long enough
      if (curLine.length >= lineLength) {
        result.push(curLine);
      }
      curLine = [];
    }
    // add cell to current line if non-empty and non-excluded
    if (color !== undefined && !shouldExclude) {
      curLine.push(colIndex);
    }
    // end of row, add last line to result if long enough
    if (colIndex === row.length - 1 && curLine.length >= lineLength) {
      result.push(curLine);
    }

    lastColor = color;
    return result;
  }, []);
}

// the main reconcile function, looks for lines of 4 or more of the same color in the grid
export function findLines(
  grid: GameGrid,
  lineLength: number = 4,
  excludeFlag: string = "isFalling"
): GridCellLocation[][] {
  const horizontalLines: GridCellLocation[][] = flatten(
    grid.map((row: GameGridRow, rowIndex: number) => {
      const rowLines: number[][] = findLinesIn(row, lineLength, excludeFlag);
      return rowLines.map(
        (line: number[]): GridCellLocation[] => {
          return line.map((colIndex: number): GridCellLocation => [rowIndex, colIndex]);
        }
      );
    })
  );

  // reslice grid into [col][row] instead of [row][col] format to check columns
  const gridCols: GameGrid = range(grid[0].length).map(
    (colIndex: number): GameGridRow => {
      return grid.map(row => row[colIndex]);
    }
  );
  const verticalLines: GridCellLocation[][] = flatten(
    gridCols.map((col: GameGridRow, colIndex: number) => {
      const colLines: number[][] = findLinesIn(col, lineLength, excludeFlag);
      return colLines.map(
        (line: number[]): GridCellLocation[] =>
          line.map((rowIndex: number): GridCellLocation => [rowIndex, colIndex])
      );
    })
  );

  // console.log('lines:', horizontalLines, verticalLines);
  return horizontalLines.concat(verticalLines);
}

// find "widows", half-pill pieces whose other halves have been destroyed
export function findWidows(grid: GameGrid): GridCellLocation[] {
  return flatten(
    grid.reduce((widows: GridCellLocation[][], row: GameGridRow, rowIndex: number) => {
      widows.push(
        row.reduce((rowWidows: GridCellLocation[], obj: GridObject, colIndex: number) => {
          if (!isPillHalf(obj)) {
            return rowWidows;
          }

          const cell: GridCellLocation = [rowIndex, colIndex];
          const neighbors: GridCellNeighbors = getCellNeighbors(grid, cell);
          const isWidow: boolean =
            (isPillLeft(obj) && !isPillRight(neighbors[Direction.Right])) ||
            (isPillRight(obj) && !isPillLeft(neighbors[Direction.Left])) ||
            (isPillTop(obj) && !isPillBottom(neighbors[Direction.Down])) ||
            (isPillBottom(obj) && !isPillTop(neighbors[Direction.Up]));

          if (isWidow) {
            rowWidows.push(cell);
          }
          return rowWidows;
        }, [])
      );
      return widows;
    }, [])
  );
}
