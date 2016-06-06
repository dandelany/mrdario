import _ from 'lodash';
import Imm from 'immutable';

import {GRID_OBJECTS, COLORS, VIRUS_COUNT_TABLE, MIN_VIRUS_ROW_TABLE} from 'constants';
import {isEmpty, isColor, getCellNeighbors} from './grid';

export const emptyObject = () => Imm.Map({type: GRID_OBJECTS.EMPTY});
export const makeDestroyed = () => Imm.Map({type: GRID_OBJECTS.DESTROYED});
export const virusObject = (color) => Imm.Map({type: GRID_OBJECTS.VIRUS, color});
export const makePillLeft = (color) => Imm.Map({type: GRID_OBJECTS.PILL_LEFT, color});
export const makePillRight = (color) => Imm.Map({type: GRID_OBJECTS.PILL_RIGHT, color});


export const emptyGrid = (width, height) =>
  Imm.List(_.times(height, () => Imm.List(_.times(width, emptyObject))));

export function generatePillSequence(colors, count=128) {
  return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
}

export function getLevelVirusCount(level) {
  return VIRUS_COUNT_TABLE[Math.min(level, VIRUS_COUNT_TABLE.length - 1)];
}

export function generateViruses(grid, level, colors) {
  // generate random viruses in a (empty) grid
  // inspired by http://tetrisconcept.net/wiki/Dr._Mario#Virus_Generation
  let virusCount = getLevelVirusCount(level);
  const origVirusCount = virusCount;
  
  while(virusCount) {
    let {cell, virus} = generateVirus(grid, level, colors, virusCount);
    if(!virus) continue; // bad virus, try again
    grid = grid.setIn(cell, virus); // good virus, put it in the cell
    virusCount--;
  }

  return {grid, virusCount: origVirusCount};
}

export function generateVirus(grid, level, colors, remaining) {
  const numRows = grid.size;
  const numCols = grid.get(0).size;
  // initial candidate row and column for our virus
  let vRow = _.random(minVirusRow(level), numRows-1);
  let vCol = _.random(0, numCols-1);

  // while not a valid location, step through the grid until we find one
  while(!isValidNewVirusLocation(grid, [vRow, vCol], colors)) {
    let next = nextGridCell([vRow, vCol], numRows, numCols);
    // stepped out the end of the grid, start over
    if(_.isNull(next)) return {cell: null, virus: null};
    [vRow, vCol] = next;
  }

  // generate a color for the virus that is not in the nearby neighbors
  let colorSeed = remaining % (colors.length + 1);
  let color = (colorSeed === colors.length) ? _.sample(colors) : colors[colorSeed];
  while(!isValidNewVirusColor(grid, [vRow, vCol], color)) {
    colorSeed = (colorSeed + 1) % (colors.length + 1);
    color = (colorSeed === colors.length) ? _.sample(colors) : colors[colorSeed];
  }

  // done, return the virus and it's location
  return {cell: [vRow, vCol], virus: virusObject(color)};
}

export function minVirusRow(level) {
  return MIN_VIRUS_ROW_TABLE[Math.min(level, MIN_VIRUS_ROW_TABLE.length - 1)];
}

export function nextGridCell([rowI, colI], numRows, numCols) {
  colI++;
  if(colI === numCols) { colI = 0; rowI++; }
  if(rowI === numRows) { return null; }
  return [rowI, colI]
}

export function isValidNewVirusLocation(grid, [rowI, colI], colors, nearby) {
  // cell must be empty
  if(!isEmpty(grid.getIn([rowI, colI]))) return false;
  if(!nearby) nearby = _.values(getCellNeighbors(grid, [rowI, colI], 2));
  // location is valid if not all colors are present in the 4 nearby cells
  return !_.every(colors, color => _.some(nearby, obj => isColor(obj, color)));
}

export function isValidNewVirusColor(grid, [rowI, colI], color, nearby) {
  if(_.isUndefined(color) || _.isNull(color)) return false;
  if(!nearby) nearby = _.values(getCellNeighbors(grid, [rowI, colI], 2));
  // virus color is valid here if none of the nearby neighbors are the same color
  return !_.some(nearby, obj => isColor(obj, color));
}
