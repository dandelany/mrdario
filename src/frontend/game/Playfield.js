import {GRID_OBJECTS, COLORS, VIRUS_COUNT_TABLE, MIN_VIRUS_ROW_TABLE} from './constants';
import {emptyGrid, generateViruses} from './utils/generators';
import {hasViruses} from './utils/grid';

import {
  givePill, movePill, slamPill, rotatePill, dropDebris, flagFallingCells, destroyLines, removeDestroyed,
} from './utils/moves';

// todo - may not need Playfield anymore now that all functions are pure
export class Playfield {
  constructor({width = 8, height = 12}) {
    this.grid = emptyGrid(width, height);
  }

  hasViruses() {
    return hasViruses(this.grid);
  }

  generateViruses(level = 0) {
    const {grid, virusCount} = generateViruses(this.grid, level, COLORS);
    this.grid = grid;
    return {grid, virusCount};
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

  slamPill() {
    const {grid, pill, didMove} = slamPill(this.grid, this.pill);
    Object.assign(this, {grid, pill});
    return didMove;
  }

  rotatePill(direction) {
    const {grid, pill, didMove} = rotatePill(this.grid, this.pill, direction);
    Object.assign(this, {grid, pill});
    return didMove;
  }

  dropDebris() {
    const {grid, fallingCells} = dropDebris(this.grid);
    Object.assign(this, {grid});
    return {grid, fallingCells};
  }

  flagFallingCells() {
    // todo refactor, do we really need to flag falling cells?
    const {grid, fallingCells} = flagFallingCells(this.grid);
    Object.assign(this, {grid});
    return {grid, fallingCells};
  }

  destroyLines(knownLines) {
    const {grid, lines, hasLines, destroyedCount, virusCount} = destroyLines(this.grid, knownLines);
    Object.assign(this, {grid});
    return {grid, lines, hasLines, destroyedCount, virusCount};
  }

  removeDestroyed() {
    this.grid = removeDestroyed(this.grid);
    return this.grid;
  }

  toJS() {
    return this.grid.toJS();
  }
}
