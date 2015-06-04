import _ from 'lodash';
import Immutable from 'immutable';
const {List, Map} = Immutable;
import { GRID_OBJECTS, COLORS } from './../constants';

// these are pure stateless functions which contain the majority of the game logic
// they use Immutable objects to represent the grid and return new objects on 'mutation'


export function generatePillSequence(colors, count=128) {
    //return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
    return _.times(count, () => List(Map({color: _.sample(colors)}), Map({color: _.sample(colors)})));
}

export function emptyObject() {
    return Map({type: GRID_OBJECTS.EMPTY});
}

export function emptyGrid(width, height) {
    return List(_.times(height, () => List(_.times(width, emptyObject))));
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

export function isPillVertical(grid, pillCells) {
    return isPillTop(grid.getIn(pillCells[0]));
}

function getCellNeighbors(grid, [rowI, colI]) {
    // returns the neighbors of the grid cell at [rowI, colI]
    return {
        up: (rowI <= 0) ?                       null : grid.getIn([rowI - 1, colI]),
        down: (rowI >= grid.size - 1) ?         null : grid.getIn([rowI + 1, colI]),
        left: (colI <= 0) ?                     null : grid.getIn([rowI, colI - 1]),
        right: (colI >= grid.get(0).size - 1) ? null : grid.getIn([rowI, colI + 1])
    }
}

function canMoveCell(grid, cell, direction) {
    return isEmpty(getCellNeighbors(grid, cell)[direction]);
}

function deltaRowCol(direction, distance = 1) {
    // create the [dRow, dCol] needed for a move in given direction and distance eg. up 1 is [-1, 0]
    const dRow = (direction === 'down') ?  distance : (direction === 'up') ? -distance : 0;
    const dCol = (direction === 'right') ? distance : (direction === 'left') ? -distance : 0;
    if(Math.abs(dRow) + Math.abs(dCol) == 0) throw "invalid direction " + direction;
    return [dRow, dCol];
}



// todo get rid of canPillMove and getPillNeighbors
// function getPillNeighbors(grid, pill) {
//    const isVertical = isPillVertical(grid, pill);
//    const neighbors1 = getCellNeighbors(grid, pill[0]);
//    const neighbors2 = getCellNeighbors(grid, pill[1]);
//    return isVertical ? {
//        up: [neighbors1.up],
//        down: [neighbors2.down],
//        left: [neighbors1.left, neighbors2.left],
//        right: [neighbors1.right, neighbors2.right]
//    } : {
//        up: [neighbors1.up, neighbors2.up],
//        down: [neighbors1.down, neighbors2.down],
//        left: [neighbors1.left],
//        right: [neighbors2.right]
//    };
//}

// function canMovePill(grid, pill, direction) {
//    return _.every(getPillNeighbors(grid, pill)[direction], isEmpty);
// }


function moveCell(grid, cell, direction) {
    if(!canMoveCell(grid, cell, direction)) return {grid, cell, didMove: false};
    const [dRow, dCol] = deltaRowCol(direction);
    const [rowI, colI] = cell;
    const newCell = [rowI + dRow, colI + dCol];

    grid = grid.setIn(newCell, grid.getIn(cell));
    grid = grid.setIn(cell, emptyObject());
    cell = [rowI + dRow, colI + dCol];
    return {grid, cell, didMove: true}
}

function moveCells(grid, cells, direction) {
    // move a set of cells (eg. a pill) at once
    // either they ALL move successfully, or none of them move
    const [dRow, dCol] = deltaRowCol(direction);

    let sortedCells = cells.slice().sort((a, b) => {
        // sort the cells, so when moving eg. down, the furthest cell down moves first
        // this way we don't overwrite newly moved elements
        return Math.abs(dRow) > 0 ? ((b[0] - a[0]) * dRow) : ((b[1] - a[1]) * dCol);
    });

    for(var i=0; i<sortedCells.length; i++) {
        let cell = sortedCells[i];
        let moved = moveCell(grid, cell, direction);
        // move unsuccessful, return original grid
        if(!moved.didMove) return {grid, cells, didMove: false};
        // move successful
        grid = moved.grid;
    }
    // all moves successful, update (unsorted) cells with new locations
    cells = cells.map(([rowI, colI]) => [rowI + dRow, colI + dCol]);
    return {grid, cells, didMove: true};
}

function movePill(grid, pill, direction) {
    const moved = moveCells(grid, pill, direction);
    return {grid: moved.grid, pill: moved.cells, didMove: moved.didMove};
}

function rotatePill(grid, pill, direction) {
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
        grid.setIn([pillRow, pillCol], emptyObject());
        pill = [[pillRow+1, pillCol], [pillRow+1, pillCol+1]];

    } else { // horizontal to vertical
        if(!isEmpty(pillNeighbors[0].up) || pill[0][0] === 0) return noMove; // no kick here

        if(direction === 'ccw') {
            grid = grid.setIn([pillRow-1, pillCol], pillParts[0].set('type', newPartTypes[0]));
            grid = grid.setIn([pillRow, pillCol], pillParts[1].set('type', newPartTypes[1]));
        } else {
            grid = grid.setIn([pillRow-1, pillCol], pillParts[1].set('type', newPartTypes[0]));
            grid = grid.setIn([pillRow, pillCol], pillParts[0].set('type', newPartTypes[1]));
        }
        grid.setIn([pillRow, pillCol+1], emptyObject());
        pill = [[pillRow-1, pillCol], [pillRow, pillCol]];
    }
    return {grid, pill, didMove: true};
}





// the main reconcile function, looks for lines of 4 or more of the same color in the grid
function findLines(grid, lineLength = 4, excludeFlag = 'isFalling') {
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
function findLinesIn(row, lineLength = 4, excludeFlag = 'isFalling') {
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
function findWidows(grid) {
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
function dropDebris(grid) {
    // start at the bottom of the grid and move up,
    // seeing which pieces can fall
    //const oldGrid = grid;
    //grid = grid.map(row => row.slice());
    let fallingCells = [];

    for(var rowI = grid.size-2; rowI >= 0; rowI--) {
        const row = grid.get(rowI);
        for(var colI = 0; colI < row.length; colI++) {
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
