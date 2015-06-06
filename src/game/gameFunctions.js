import _ from 'lodash';
import Immutable from 'immutable';
const {List, Map} = Immutable;
import { GRID_OBJECTS, COLORS, VIRUS_COUNT_TABLE, MIN_VIRUS_ROW_TABLE } from './../constants';

// these are pure stateless functions which contain the majority of the game logic
// they use Immutable objects to represent the grid and return new objects on 'mutation'

export class Grid {
    constructor({width = 8, height = 12}) {
        this.grid = emptyGrid(width, height);
    }
    generateViruses() {
        this.grid = generateViruses(this.grid, 5, COLORS);
    }
    givePill(pillColors) {
        const {grid, pill, didGive} = givePill(this.grid, pillColors);
        _.assign(this, {grid, pill});
        return didGive;
    }
    movePill(direction) {
        const {grid, pill, didMove} = movePill(this.grid, this.pill, direction);
        _.assign(this, {grid, pill});
        return didMove;
    }
    rotatePill(direction) {
        const {grid, pill, didMove} = rotatePill(this.grid, this.pill, direction);
        _.assign(this, {grid, pill});
        return didMove;
    }
    dropDebris() {
        const {fallingCells, grid} = dropDebris(this.grid);
        _.assign(this, {grid});
        return {fallingCells, grid};
    }
    flagFallingCells() {
        let {fallingCells, grid} = dropDebris(this.grid); // check if there is debris to drop
        this.grid = this.grid.map(row => row.map(cell => cell.set('isFalling', false)));
        this.grid = this.grid.map(row => row.map(cell => cell.set('isFalling', false)));
        fallingCells.forEach(cell => this.grid = this.grid.setIn(cell.concat(['isFalling']), true));
        return {fallingCells, grid};
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
            //this.modeMachine.destroy();
        }
        return hasLines;
    }
    destroyCell([rowI, colI]) {
        // set grid cell to destroyed
        this.grid = this.grid.setIn([rowI, colI], Map({type: GRID_OBJECTS.DESTROYED}));
    }
    removeCell([rowI, colI]) {
        //this.grid[rowI][colI] = emptyObject();
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
        //this.grid[rowI][colI] = _.assign({}, this.grid[rowI][colI], {type: GRID_OBJECTS.PILL_SEGMENT});
        this.grid = this.grid.mergeIn([rowI, colI], {type: GRID_OBJECTS.PILL_SEGMENT});
    }

    toJS() {
        return this.grid.toJS();
    }
}

export function generatePillSequence(colors, count=128) {
    //return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
    return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
}


export function generateViruses(grid, level, colors) {
    // generate random viruses in a (empty) grid
    // inspired by http://tetrisconcept.net/wiki/Dr._Mario#Virus_Generation
    let virusCount = getVirusCount(level);
    while(virusCount) {
        let {cell, virus} = generateVirus(grid, level, colors, virusCount);
        if(!virus) continue; // bad virus, try again
        grid = grid.setIn(cell, virus); // good virus, put it in the cell
        virusCount--;
    }
    return grid;
}
function getVirusCount(level) {
    return VIRUS_COUNT_TABLE[Math.min(level, VIRUS_COUNT_TABLE.length - 1)];
}
function generateVirus(grid, level, colors, remaining) {
    const numRows = grid.size;
    const numCols = grid.get(0).size;
    // initial candidate row and column for our virus
    let vRow = _.random(minVirusRow(level), numRows-1);
    let vCol = _.random(0, numCols-1);

    // while not a valid location, step through the grid until we find one
    while(!isValidVirusLocation(grid, [vRow, vCol], colors)) {
        let next = nextGridCell([vRow, vCol], numRows, numCols);
        // stepped out the end of the grid, start over
        if(_.isNull(next)) return {cell: null, virus: null};
        [vRow, vCol] = next;
    }

    // generate a color for the virus that is not in the nearby neighbors
    let colorSeed = remaining % (colors.length + 1);
    let color = (colorSeed === colors.length) ? _.sample(colors) : colors[colorSeed];
    while(!isValidVirusColor(grid, [vRow, vCol], color)) {
        colorSeed = (colorSeed + 1) % (colors.length + 1);
        color = (colorSeed === colors.length) ? _.sample(colors) : colors[colorSeed];
    }

    // done, return the virus and it's location
    return {cell: [vRow, vCol], virus: Map({type: GRID_OBJECTS.VIRUS, color: color})};
}
function minVirusRow(level) {
    return MIN_VIRUS_ROW_TABLE[Math.min(level, MIN_VIRUS_ROW_TABLE.length - 1)];
}
function nextGridCell([rowI, colI], numRows, numCols) {
    colI++;
    if(colI === numCols) { colI = 0; rowI++; }
    if(rowI === numRows) { return null; }
    return [rowI, colI]
}
function isValidVirusLocation(grid, [rowI, colI], colors, nearby) {
    // cell must be empty
    if(!isEmpty(grid.getIn([rowI, colI]))) return false;
    if(!nearby) nearby = _.values(getCellNeighbors(grid, [rowI, colI], 2));
    // location is valid if not all colors are present in the 4 nearby cells
    return !_.every(colors, color => _.any(nearby, obj => isColor(obj, color)));
}
function isValidVirusColor(grid, [rowI, colI], color, nearby) {
    if(_.isUndefined(color) || _.isNull(color)) return false;
    if(!nearby) nearby = _.values(getCellNeighbors(grid, [rowI, colI], 2));
    // virus color is valid here if none of the nearby neighbors are the same color
    return !_.any(nearby, obj => isColor(obj, color));
}


export function emptyObject() {
    return Map({type: GRID_OBJECTS.EMPTY});
}
export function virusObject(color) {
    return Map({type: GRID_OBJECTS.VIRUS, color});
}

export function emptyGrid(width, height) {
    return List(_.times(height, () => List(_.times(width, emptyObject))));
}


function isColor(obj, color) {
    return obj && obj.get && obj.get('color') === color
}
export function isObjType(obj, type) {
    return obj && obj.get && obj.get('type') === type
}
export const isEmpty = _.partialRight(isObjType, GRID_OBJECTS.EMPTY);
export const isDestroyed = _.partialRight(isObjType, GRID_OBJECTS.DESTROYED);
export const isPillTop = _.partialRight(isObjType, GRID_OBJECTS.PILL_TOP);


export function getCellObj(grid, cell) { // cell is [rowI, colI] coordinates
    return grid.getIn(cell);
}

export function givePill(grid, pillColors) {
    // todo: if entry place is blocked, lose the game
    // add new pill to grid
    let row = grid.get(0);
    const pillCol = Math.floor(row.size / 2) - 1;
    const pill = [[0, pillCol], [0, pillCol+1]];

    if(!_.every(pill, cell => isEmpty(grid.getIn(cell))))
        return {grid, pill, didGive: false};

    const pillObjLeft = Map(_.assign({type: GRID_OBJECTS.PILL_LEFT}, pillColors[0]));
    const pillObjRight = Map(_.assign({type: GRID_OBJECTS.PILL_RIGHT}, pillColors[1]));
    grid = grid.setIn([0, pillCol], pillObjLeft);
    grid = grid.setIn([0, pillCol+1], pillObjRight);

    return {grid, pill, didGive: true};
}

export function isPillVertical(grid, pillCells) {
    return isPillTop(grid.getIn(pillCells[0]));
}

export function getCellNeighbors(grid, [rowI, colI], distance = 1) {
    // returns the neighbors of the grid cell at [rowI, colI]
    return {
        up: (rowI - distance < 0) ?                       null : grid.getIn([rowI - distance, colI]),
        down: (rowI + distance > grid.size - 1) ?         null : grid.getIn([rowI + distance, colI]),
        left: (colI - distance < 0) ?                     null : grid.getIn([rowI, colI - distance]),
        right: (colI + distance > grid.get(0).size - 1) ? null : grid.getIn([rowI, colI + distance])
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


// the main reconcile function, looks for lines of 4 or more of the same color in the grid
export function findLines(grid, lineLength = 4, excludeFlag = 'isFalling') {
    const horizontalLines = _.flatten(grid.map((row, rowI) => {
        return findLinesIn(row, lineLength, excludeFlag).map(line => line.map(colI => [rowI, colI]));
    }).toJS());

    // reslice grid into [col][row] instead of [row][col] format to check columns
    const gridCols = List(_.range(grid.get(0).size).map(colI => grid.map(row => row.get(colI))));
    const verticalLines = _.flatten(gridCols.map((col, colI) => {
        return findLinesIn(col, lineLength, excludeFlag).map(line => line.map(rowI => [rowI, colI]));
    }).toJS());

    console.log('lines:', horizontalLines, verticalLines);
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

// find pieces in the grid which are unsupported and should fall in cascade
export function dropDebris(grid) {
    // start at the bottom of the grid and move up,
    // seeing which pieces can fall
    //const oldGrid = grid;
    //grid = grid.map(row => row.slice());
    let fallingCells = [];

    for(var rowI = grid.size-2; rowI >= 0; rowI--) {
        const row = grid.get(rowI);
        for(var colI = 0; colI < row.size; colI++) {
            const obj = grid.getIn([rowI, colI]);
            let didMove = false;
            if(isObjType(obj, GRID_OBJECTS.PILL_SEGMENT)) {
                ({grid, didMove} = moveCell(grid, [rowI, colI], 'down'));
                if(didMove) fallingCells.push([rowI, colI]);
            } else if(isObjType(obj, GRID_OBJECTS.PILL_LEFT)) {
                ({grid, didMove} = moveCells(grid, [[rowI, colI], [rowI, colI+1]], 'down'));
                if(didMove) fallingCells.push([rowI, colI], [rowI, colI+1]);
            } else if(isObjType(obj, GRID_OBJECTS.PILL_TOP)) {
                ({grid, didMove} = moveCells(grid, [[rowI, colI], [rowI+1, colI]], 'down'));
                if(didMove) fallingCells.push([rowI, colI], [rowI+1, colI]);
            }
        }
    }
    return {grid, fallingCells};
}
