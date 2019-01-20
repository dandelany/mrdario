import * as _ from "lodash";

import {
  Direction,
  GameColor,
  GameGrid,
  GameGridRow,
  GridCellLocation,
  GridCellLocationDelta,
  GridCellNeighbors,
  GridObject,
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

export function getInRow(row: GameGridRow<number>, colI: number): MaybeGridObject {
  if (colI >= row.length || colI < 0) return null;
  return row[colI];
}

export function getInGrid(
  grid: GameGrid<number, number>,
  location: GridCellLocation
): MaybeGridObject {
  const [rowI, colI] = location;
  if (rowI >= grid.length || rowI < 0) return null;
  return getInRow(grid[rowI], colI);
}

export function hasViruses(grid: GameGrid<number, number>): boolean {
  return !grid.every(row => row.every(cell => !isVirus(cell)));
}

export function isPillVertical(grid: GameGrid<number, number>, pillCells: GridCellLocation[]) {
  return isPillTop(getInGrid(grid, pillCells[0]));
}

export function getCellNeighbors(
  grid: GameGrid<number, number>,
  location: GridCellLocation,
  distance = 1
): GridCellNeighbors {
  const [rowI, colI] = location;
  // returns the neighbors of the grid cell at [rowI, colI]
  // some may be undefined if out of bounds
  return {
    [Direction.Up]: getInGrid(grid, [rowI - distance, colI]),
    [Direction.Down]: getInGrid(grid, [rowI + distance, colI]),
    [Direction.Left]: getInGrid(grid, [rowI, colI - distance]),
    [Direction.Right]: getInGrid(grid, [rowI, colI + distance])
  };
}

export function canMoveCell(
  grid: GameGrid<number, number>,
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
  if (Math.abs(dRow) + Math.abs(dCol) == 0) throw "invalid direction " + direction;
  return [dRow, dCol];
}

// find same-color lines within a single row or column
export function findLinesIn(
  row: GameGridRow<number>,
  lineLength = 4,
  excludeFlag = "isFalling"
): number[][] {
  let lastColor: GameColor | undefined;
  let curLine: number[] = [];

  return row.reduce((result: number[][], obj: GridObject, i: number) => {
    let color: GameColor | undefined;
    if (hasColor(obj)) color = obj.color;

    const shouldExclude = excludeFlag && !!obj[excludeFlag];
    if (i > 0 && (color !== lastColor || shouldExclude)) {
      // different color, end the current line and add to result if long enough
      if (curLine.length >= lineLength) result.push(curLine);
      curLine = [];
    }
    // add cell to current line if non-empty and non-excluded
    if (!_.isUndefined(color) && !shouldExclude) curLine.push(i);
    // end of row, add last line to result if long enough
    if (i === row.length - 1 && curLine.length >= lineLength) result.push(curLine);

    lastColor = color;
    return result;
  }, []);
}

// the main reconcile function, looks for lines of 4 or more of the same color in the grid
export function findLines(
  grid: GameGrid<number, number>,
  lineLength: number = 4,
  excludeFlag: string = "isFalling"
): number[][][] {
  const horizontalLines = _.flatten(
    grid.map((row: GameGridRow<number>, rowI: number) => {
      return findLinesIn(row, lineLength, excludeFlag).map(line => line.map(colI => [rowI, colI]));
    })
  );

  // reslice grid into [col][row] instead of [row][col] format to check columns
  const gridCols: GameGrid<number, number> = _.range(grid[0].length).map(
    (colI: number): GameGridRow<number> => {
      return grid.map(row => row[colI]);
    }
  );
  const verticalLines = _.flatten(
    gridCols.map((col, colI) => {
      return findLinesIn(col, lineLength, excludeFlag).map(line => line.map(rowI => [rowI, colI]));
    })
  );

  //console.log('lines:', horizontalLines, verticalLines);
  return horizontalLines.concat(verticalLines);
}

// find "widows", half-pill pieces whose other halves have been destroyed
export function findWidows(grid: GameGrid<number, number>): GridCellLocation[] {
  return _.flatten(
    grid.reduce((widows: GridCellLocation[][], row: GameGridRow<number>, rowI: number) => {
      widows.push(
        row.reduce((rowWidows: GridCellLocation[], obj: GridObject, colI: number) => {
          if (!isPillHalf(obj)) return rowWidows;

          const cell: GridCellLocation = [rowI, colI];
          const neighbors: GridCellNeighbors = getCellNeighbors(grid, cell);
          const isWidow: boolean =
            (isPillLeft(obj) && !isPillRight(neighbors[Direction.Right])) ||
            (isPillRight(obj) && !isPillLeft(neighbors[Direction.Left])) ||
            (isPillTop(obj) && !isPillBottom(neighbors[Direction.Down])) ||
            (isPillBottom(obj) && !isPillTop(neighbors[Direction.Up]));

          if (isWidow) rowWidows.push(cell);
          return rowWidows;
        }, [])
      );
      return widows;
    }, [])
  );
}
