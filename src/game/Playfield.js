import _ from 'lodash';
import Imm from 'immutable';

import {GRID_OBJECTS, COLORS, VIRUS_COUNT_TABLE, MIN_VIRUS_ROW_TABLE} from 'constants';
import {emptyObject, emptyGrid, generateViruses} from './utils/generators';
import {
  findLines, findWidows, hasViruses, isDestroyed
} from './utils/grid';

import {givePill, movePill, rotatePill, dropDebris} from './utils/moves';

export class Playfield {
  constructor({width = 8, height = 12}) {
    this.grid = emptyGrid(width, height);
  }

  generateViruses(level = 0) {
    this.grid = generateViruses(this.grid, level, COLORS);
  }

  givePill(pillColors) {
    const {grid, pill, didGive} = givePill(this.grid, pillColors);
    Object.assign(this, {grid, pill});
    return didGive;
  }

  movePill(direction) {
    const {grid, pill, didMove} = movePill(this.grid, this.pill, direction);
    Object.assign(this, {grid, pill});
    return didMove;
  }

  rotatePill(direction) {
    const {grid, pill, didMove} = rotatePill(this.grid, this.pill, direction);
    Object.assign(this, {grid, pill});
    return didMove;
  }

  dropDebris() {
    const {fallingCells, grid} = dropDebris(this.grid);
    Object.assign(this, {grid});
    return {fallingCells, grid};
  }

  flagFallingCells() {
    // todo refactor, do we really need to flag falling cells?
    // findLines should be able to detect which cells are falling so no need for this
    let {fallingCells, grid} = dropDebris(this.grid); // check if there is debris to drop
    this.grid = this.grid.map(row => row.map(cell => cell.set('isFalling', false)));
    fallingCells.forEach(cell => this.grid = this.grid.setIn(cell.concat(['isFalling']), true));
    return {fallingCells, grid};
  }

  hasViruses() {
    return hasViruses(this.grid);
  }

  // todo clean these up
  destroyLines(lines) {
    if(_.isUndefined(lines)) lines = findLines(this.grid);
    const hasLines = !!(lines && lines.length);
    if(hasLines) {
      // set cells in lines to destroyed
      _.flatten(lines).forEach(this.destroyCell.bind(this));
      // turn widowed pill halves into rounded 1-square pill segments
      findWidows(this.grid).forEach(this.setPillSegment.bind(this));
    }
    return hasLines;
  }

  destroyCell([rowI, colI]) {
    // set grid cell to destroyed
    this.grid = this.grid.setIn([rowI, colI], Imm.Map({type: GRID_OBJECTS.DESTROYED}));
  }

  removeCell([rowI, colI]) {
    this.grid = this.grid.setIn([rowI, colI], emptyObject());
  }

  removeDestroyed() {
    this.grid.forEach((row, rowI) => row.forEach((cell, colI) => {
      const shouldRemove = isDestroyed(this.grid.getIn([rowI,colI]));
      if(shouldRemove) this.removeCell([rowI, colI]);
    }))
  }

  setPillSegment([rowI, colI]) {
    // set grid cell to be a rounded pill segment
    this.grid = this.grid.mergeIn([rowI, colI], {type: GRID_OBJECTS.PILL_SEGMENT});
  }

  toJS() {
    return this.grid.toJS();
  }
}
