import _ from 'lodash';
import get from 'lodash/get';
import Imm from 'immutable';

import {GRID_OBJECTS /*, COLORS, VIRUS_COUNT_TABLE, MIN_VIRUS_ROW_TABLE */} from 'constants';
import {
  isEmpty, isPillLeft, isPillTop, isPillSegment, isPillVertical, getCellNeighbors, canMoveCell, deltaRowCol
} from './grid';
import {makePillLeft, makePillRight, emptyObject} from './generators';

// Pure functions which perform updates on the
// Immutable game grid/cell objects, returning the updated objects.
// These contain most of the central game logic.

export function givePill(grid, pillColors) {
  // add new pill to grid
  let row = grid.get(0);
  const pillCol = Math.floor(row.size / 2) - 1;
  const pill = [[0, pillCol], [0, pillCol+1]];

  if(!_.every(pill, cell => isEmpty(grid.getIn(cell))))
    return {grid, pill, didGive: false};

  const pillLeft = makePillLeft(get(pillColors, '0.color'));
  const pillRight = makePillRight(get(pillColors, '1.color'));
  grid = grid.setIn([0, pillCol], pillLeft);
  grid = grid.setIn([0, pillCol+1], pillRight);

  return {grid, pill, didGive: true};
}

export function moveCell(grid, cell, direction) {
  if(!canMoveCell(grid, cell, direction)) return {grid, cell, didMove: false};
  const [dRow, dCol] = deltaRowCol(direction);
  const [rowI, colI] = cell;
  const newCell = [rowI + dRow, colI + dCol];

  grid = grid.setIn(newCell, grid.getIn(cell));
  grid = grid.setIn(cell, emptyObject());
  cell = [rowI + dRow, colI + dCol];
  return {grid, cell, didMove: true}
}

export function moveCells(grid, cells, direction) {
  // move a set of cells (eg. a pill) at once
  // either they ALL move successfully, or none of them move
  const [dRow, dCol] = deltaRowCol(direction);

  let sortedCells = cells.slice().sort((a, b) => {
    // sort the cells, so when moving eg. down, the furthest cell down moves first
    // this way we don't overwrite newly moved elements
    return Math.abs(dRow) > 0 ? ((b[0] - a[0]) * dRow) : ((b[1] - a[1]) * dCol);
  });
  const oldGrid = grid;

  for(var i=0; i<sortedCells.length; i++) {
    let cell = sortedCells[i];
    let moved = moveCell(grid, cell, direction);
    // move unsuccessful, return original grid
    if(!moved.didMove) return {grid: oldGrid, cells, didMove: false};
    // move successful
    grid = moved.grid;
  }
  // all moves successful, update (unsorted) cells with new locations
  cells = cells.map(([rowI, colI]) => [rowI + dRow, colI + dCol]);
  return {grid, cells, didMove: true};
}

export function movePill(grid, pill, direction) {
  const moved = moveCells(grid, pill, direction);
  return {grid: moved.grid, pill: moved.cells, didMove: moved.didMove};
}

export function rotatePill(grid, pill, direction) {
  // http://tetrisconcept.net/wiki/Dr._Mario#Rotation_system
  const pillNeighbors = [getCellNeighbors(grid, pill[0]), getCellNeighbors(grid, pill[1])];
  const isVertical = isPillVertical(grid, pill);
  const [pillRow, pillCol] = pill[0];
  const noMove = {grid, pill, didMove: false};

  const pillParts = _.map(pill, ([segRow, segCol]) => grid.getIn([segRow, segCol]));
  const newPartTypes = isVertical ?
    [GRID_OBJECTS.PILL_LEFT, GRID_OBJECTS.PILL_RIGHT] : [GRID_OBJECTS.PILL_TOP, GRID_OBJECTS.PILL_BOTTOM];

  if(isVertical) { // vertical to horizontal
    if(!isEmpty(pillNeighbors[1].right)) {
      if(!isEmpty(pillNeighbors[1].left)) return noMove; // no kick, stuck between blocks
      // todo kick left
      return noMove;
    }

    if(direction === 'cw') {
      grid = grid.setIn([pillRow+1, pillCol], pillParts[1].set('type', newPartTypes[0]));
      grid = grid.setIn([pillRow+1, pillCol+1], pillParts[0].set('type', newPartTypes[1]));
    } else {
      grid = grid.setIn([pillRow+1, pillCol], pillParts[0].set('type', newPartTypes[0]));
      grid = grid.setIn([pillRow+1, pillCol+1], pillParts[1].set('type', newPartTypes[1]));
    }
    grid = grid.setIn([pillRow, pillCol], emptyObject());
    pill = [[pillRow+1, pillCol], [pillRow+1, pillCol+1]];

  } else { // horizontal to vertical
    if(!isEmpty(pillNeighbors[0].up) || pill[0][0] === 0) return noMove; // no kick here

    if(direction === 'cw') {
      grid = grid.setIn([pillRow-1, pillCol], pillParts[0].set('type', newPartTypes[0]));
      grid = grid.setIn([pillRow, pillCol], pillParts[1].set('type', newPartTypes[1]));
    } else {
      grid = grid.setIn([pillRow-1, pillCol], pillParts[1].set('type', newPartTypes[0]));
      grid = grid.setIn([pillRow, pillCol], pillParts[0].set('type', newPartTypes[1]));
    }
    grid = grid.setIn([pillRow, pillCol+1], emptyObject());
    pill = [[pillRow-1, pillCol], [pillRow, pillCol]];
  }
  return {grid, pill, didMove: true};
}

// find pieces in the grid which are unsupported and should fall in cascade
export function dropDebris(grid) {
  // start at the bottom of the grid and move up,
  // seeing which pieces can fall
  let fallingCells = [];

  for(var rowI = grid.size-2; rowI >= 0; rowI--) {
    const row = grid.get(rowI);
    for(var colI = 0; colI < row.size; colI++) {
      const obj = grid.getIn([rowI, colI]);
      let didMove = false;

      if(isPillSegment(obj)) {
        ({grid, didMove} = moveCell(grid, [rowI, colI], 'down'));
        if(didMove) fallingCells.push([rowI, colI]);

      } else if(isPillLeft(obj)) {
        ({grid, didMove} = moveCells(grid, [[rowI, colI], [rowI, colI+1]], 'down'));
        if(didMove) fallingCells.push([rowI, colI], [rowI, colI+1]);

      } else if(isPillTop(obj)) {
        ({grid, didMove} = moveCells(grid, [[rowI, colI], [rowI+1, colI]], 'down'));
        if(didMove) fallingCells.push([rowI, colI], [rowI+1, colI]);
      }
    }
  }
  return {grid, fallingCells};
}
