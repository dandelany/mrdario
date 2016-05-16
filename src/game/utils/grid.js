import _ from 'lodash';
import Imm from 'immutable';

import {GRID_OBJECTS} from 'constants';

// these are pure stateless functions which contain the majority of the game logic
// they use Immutable objects to represent the grid and return new objects on 'mutation'

export const isObjType = (obj, type) => (obj && obj.get && obj.get('type') === type);
export const isColor = (obj, color) => (obj && obj.get && obj.get('color') === color);

export const isEmpty = (obj) => isObjType(obj, GRID_OBJECTS.EMPTY);
export const isDestroyed = (obj) => isObjType(obj, GRID_OBJECTS.DESTROYED);
export const isPillTop = (obj) => isObjType(obj, GRID_OBJECTS.PILL_TOP);
export const isPillLeft = (obj) => isObjType(obj, GRID_OBJECTS.PILL_LEFT);
export const isPillSegment = (obj) => isObjType(obj, GRID_OBJECTS.PILL_SEGMENT);
export const isVirus = (obj) => isObjType(obj, GRID_OBJECTS.VIRUS);

export function hasViruses(grid) {
  return !grid.every(row => row.every(cell => !isVirus(cell)));
}

export function isPillVertical(grid, pillCells) {
  return isPillTop(grid.getIn(pillCells[0]));
}

export function getCellNeighbors(grid, [rowI, colI], distance = 1) {
  // returns the neighbors of the grid cell at [rowI, colI]
  return {
    up: (rowI - distance < 0) ? null :
      grid.getIn([rowI - distance, colI]),
    down: (rowI + distance > grid.size - 1) ? null :
      grid.getIn([rowI + distance, colI]),
    left: (colI - distance < 0) ? null :
      grid.getIn([rowI, colI - distance]),
    right: (colI + distance > grid.get(0).size - 1) ? null :
      grid.getIn([rowI, colI + distance])
  }
}

export function canMoveCell(grid, cell, direction) {
  return isEmpty(getCellNeighbors(grid, cell)[direction]);
}

export function deltaRowCol(direction, distance = 1) {
  // create the [dRow, dCol] needed for a move in given direction and distance eg. up 1 is [-1, 0]
  const dRow = (direction === 'down') ?  distance : (direction === 'up') ? -distance : 0;
  const dCol = (direction === 'right') ? distance : (direction === 'left') ? -distance : 0;
  if(Math.abs(dRow) + Math.abs(dCol) == 0) throw "invalid direction " + direction;
  return [dRow, dCol];
}


// the main reconcile function, looks for lines of 4 or more of the same color in the grid
export function findLines(grid, lineLength = 4, excludeFlag = 'isFalling') {
  const horizontalLines = _.flatten(grid.map((row, rowI) => {
    return findLinesIn(row, lineLength, excludeFlag).map(line => line.map(colI => [rowI, colI]));
  }).toJS());

  // reslice grid into [col][row] instead of [row][col] format to check columns
  const gridCols = Imm.List(_.range(grid.get(0).size).map(colI => grid.map(row => row.get(colI))));
  const verticalLines = _.flatten(gridCols.map((col, colI) => {
    return findLinesIn(col, lineLength, excludeFlag).map(line => line.map(rowI => [rowI, colI]));
  }).toJS());

  //console.log('lines:', horizontalLines, verticalLines);
  return horizontalLines.concat(verticalLines);
}

// find same-color lines within a single row or column
export function findLinesIn(row, lineLength = 4, excludeFlag = 'isFalling') {
  let lastColor = undefined;
  let curLine = [];

  return row.reduce((result, obj, i) => {
    const color = obj.get('color');
    const shouldExclude = excludeFlag && !!obj.get(excludeFlag);
    if(i > 0 && (color != lastColor || shouldExclude)) {
      // different color, end the current line and add to result if long enough
      if(curLine.length >= lineLength) result.push(curLine);
      curLine = [];
    }
    // add cell to current line if non-empty and non-excluded
    if(!_.isUndefined(color) && !shouldExclude) curLine.push(i);
    // end of row, add last line to result if long enough
    if((i === row.size - 1) && (curLine.length >= lineLength)) result.push(curLine);

    lastColor = color;
    return result;
  }, []);
}

// find "widows", half-pill pieces whose other halves have been destroyed
export function findWidows(grid) {
  const {PILL_LEFT, PILL_RIGHT, PILL_TOP, PILL_BOTTOM} = GRID_OBJECTS;
  const pillTypes = [PILL_LEFT, PILL_RIGHT, PILL_TOP, PILL_BOTTOM];

  return _.flatten(grid.reduce((widows, row, rowI) => {
    widows.push(row.reduce((rowWidows, obj, colI) => {
      const type = obj.get('type');
      if(!_.includes(pillTypes, type)) return rowWidows;

      const cell = [rowI, colI];
      const neighbors = getCellNeighbors(grid, cell);
      const isWidow =
        ((type === PILL_LEFT) && !isObjType(neighbors.right, PILL_RIGHT)) ||
        ((type === PILL_RIGHT) && !isObjType(neighbors.left, PILL_LEFT))  ||
        ((type === PILL_TOP) && !isObjType(neighbors.down, PILL_BOTTOM))  ||
        ((type === PILL_BOTTOM) && !isObjType(neighbors.up, PILL_TOP));

      if(isWidow) rowWidows.push(cell);
      return rowWidows;
    }, []));
    return widows;
  }, []));
}
