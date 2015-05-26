const _ = require('lodash');
const modeTransitions = {};
const { GRID_OBJECTS, INPUTS, COLORS } = require('./../constants');
const StateMachine = require('javascript-state-machine');
const keyMirror = require('keymirror');


// http://tetrisconcept.net/wiki/Dr._Mario#Gravity
// # of frames it takes player pill to drop 1 row at speed [index]
const GRAVITY_TABLE = [
    69, 67, 65, 63, 61,  59, 57, 55, 53, 51,
    49, 47, 45, 43, 41,  39, 37, 35, 33, 31,
    29, 27, 25, 23, 21,  19, 18, 17, 16, 15,
    14, 13, 12, 11, 10,   9,  9,  8,  8,  7,
    7,  6,  6,  5,  5,   5,  5,  5,  5,  5,
    5,  5,  5,  5,  5,   4,  4,  4,  4,  4,
    3,  3,  3,  3,  3,   2,  2,  2,  2,  2,
    1
];
function gravityFrames(speed) { return GRAVITY_TABLE[Math.min(speed, GRAVITY_TABLE.length - 1)]; }

const MODES = keyMirror({
    LOADING: null, //
    READY: null, // ready for a new pill
    PLAYING: null, // pill is in play and falling
    RECONCILE: null, // pill is locked in place, checking for lines to destroy
    DESTRUCTION: null, // lines are being destroyed
    CASCADE: null // debris cascade after line destruction, or during multiplayer punishment
});

export default class Playfield {
    constructor({width=8, height=12, baseSpeed=15, dropSpeed=1}) {
        _.assign(this, {
            modeMachine: StateMachine.create({
                initial: MODES.LOADING,
                events: [
                    {name: 'loaded', from: MODES.LOADING, to: MODES.READY},
                    {name: 'play', from: MODES.READY, to: MODES.PLAYING},
                    {name: 'reconcile', from: [MODES.PLAYING, MODES.CASCADE], to: MODES.RECONCILE},
                    {name: 'destroy', from: MODES.RECONCILE, to: MODES.DESTRUCTION},
                    {name: 'cascade', from: MODES.DESTRUCTION, to: MODES.CASCADE},
                    {name: 'ready', from: MODES.RECONCILE, to: MODES.READY}
                ]
            }),
            width, height,

            // increments every 10 capsules to speed up over time
            speedCounter: 0,
            // value representing pill fall speed, increases over time
            // lookup speed in gravityTable to get # of frames it takes to fall 1 row
            playSpeed: baseSpeed,
            playGravity: gravityFrames(baseSpeed),

            // the grid which track
            grid: emptyGrid(width, height)
        });

        this.modeMachine.onenterstate = function(event, lastMode, newMode) {
            console.log('playfield mode transition:', event, lastMode, newMode);
        }.bind(this);
    }
    tick(inputQueue) {
        // switch mode
        // case playing:
            // try to drop pill
            // if failed, lock pill and reconcile
        // case reconciling:
            // check for lines
            // if lines, destroy them and cascade debris
        // case debris fall

        switch (this.modeMachine.current) {

            case MODES.LOADING:
                this.modeMachine.loaded();
                break;

            case MODES.READY:
                this.givePill();
                this.modeMachine.play();
                break;

            case MODES.PLAYING:
                //console.log('playing');
                this.mutateCounter = 0;
                this.playTickCounter = this.playTickCounter ? this.playTickCounter + 1 : 1;

                while(inputQueue.length) {
                    const input = inputQueue.shift();
                    //console.log('got input', input);
                    //if(input === INPUTS.LEFT) {
                    //    let {grid, pill, didMove} = moveLeft(this.grid, this.pill);
                    //    _.assign(this, {grid, pill});
                    //} else if(input === INPUTS.RIGHT) {
                    //    let {grid, pill, didMove} = moveRight(this.grid, this.pill);
                    //    _.assign(this, {grid, pill});
                    //}
                    this.handleInput(input);
                }

                if(this.playTickCounter > this.playGravity) {
                    let {grid, pill, didMove} = lowerPill(this.grid, this.pill);
                    _.assign(this, {grid, pill});
                    this.playTickCounter = 0;
                    if(!didMove) {
                        this.modeMachine.reconcile();
                        this.modeMachine.ready();
                    }
                }

                break;

            case MODES.RECONCILE:
                break;
            case MODES.DESTRUCTION:
                break;
            case MODES.CASCADE:
                break;
        }
    }
    givePill() {
        // add new pill to grid
        let row = this.grid[0];
        const pillCol = Math.floor(row.length / 2) - 1;

        row[pillCol] = {type: GRID_OBJECTS.PILL_LEFT, color: COLORS.RED};
        row[pillCol+1] = {type: GRID_OBJECTS.PILL_RIGHT, color: COLORS.BLUE};
        this.pill = [[0, pillCol], [0, pillCol+1]];
        //this.grid = this.grid.slice();
        this.mutateCounter++;
    }

    handleInput(input) {
        console.log('got input', input);
        if(_.includes([INPUTS.LEFT, INPUTS.RIGHT], input)) {
            let direction = (input === INPUTS.LEFT) ? 'left' : 'right';
            let {grid, pill, didMove} = movePill3(this.grid, this.pill, direction);
            _.assign(this, {grid, pill});
        }

        //if(input === INPUTS.LEFT) {
        //    let {grid, pill, didMove} = moveLeft(this.grid, this.pill);
        //    _.assign(this, {grid, pill});
        //} else if(input === INPUTS.RIGHT) {
        //    let {grid, pill, didMove} = moveRight(this.grid, this.pill);
        //    _.assign(this, {grid, pill});
        //}
    }
    emptyGrid() {

    }
    populateViruses() {

    }
}

const EMPTY_OBJECT = { type: GRID_OBJECTS.EMPTY };
function emptyObject() { return EMPTY_OBJECT; }
function isEmpty(obj) { return obj && obj.type === GRID_OBJECTS.EMPTY; }

function emptyGrid(width, height) {
    return _.times(height, () => _.times(width, emptyObject));
}

function isPillVertical(grid, pill) {
    return grid[pill[0][0]][pill[0][1]].type === GRID_OBJECTS.PILL_TOP;
}

function neighbors(grid, [rowI, colI]) {
    // returns the neighbors of the grid cell at [rowI, colI]
    return {
        top: (rowI <= 0) ? null : grid[rowI - 1][colI],
        bottom: (rowI >= grid.length - 1) ? null : grid[rowI + 1][colI],
        left: (colI <= 0) ? null : grid[rowI][colI - 1],
        right: (colI >= grid[0].length - 1) ? null : grid[rowI][colI + 1],
    }
}
function pillNeighbors(grid, pill) {
    const isVertical = isPillVertical(grid, pill);
    const neighbors1 = neighbors(grid, pill[0]);
    const neighbors2 = neighbors(grid, pill[1]);
    return isVertical ? {
        top: [neighbors1.top],
        bottom: [neighbors2.bottom],
        left: [neighbors1.left, neighbors2.left],
        right: [neighbors1.right, neighbors2.right]
    } : {
        top: [neighbors1.top, neighbors2.top],
        bottom: [neighbors1.bottom, neighbors2.bottom],
        left: [neighbors1.left],
        right: [neighbors2.right]
    };
}

function givePill(oldGrid) {
    // add new pill to grid
    var grid = oldGrid.slice();
    var row = oldGrid[0].slice();
    const pillCol = Math.floor(row.length / 2) - 1;

    row[pillCol] = {type: GRID_OBJECTS.PILL_LEFT, color: COLORS.RED};
    row[pillCol+1] = {type: GRID_OBJECTS.PILL_RIGHT, color: COLORS.BLUE};
    grid[0] = row;

    return {grid, pill: [[0, pillCol], [0, pillCol+1]]}
}

function givePillVertical(oldGrid) {
    let grid = oldGrid.slice();
    const pillCol = Math.floor(grid[0].length / 2) - 1;
    grid[0][pillCol] = {type: GRID_OBJECTS.PILL_TOP, color: COLORS.RED};
    grid[1][pillCol] = {type: GRID_OBJECTS.PILL_BOTTOM, color: COLORS.YELLOW};

    return {grid, pill: [[0, pillCol], [1, pillCol]]}
}

function movePill(oldGrid, pill, dRows=0, dCols=0) {
    if(Math.abs(dRows) + Math.abs(dCols) > 1) throw "movePill only moves one space at a time";

    const direction =
        (dRows === 1) ? 'bottom' : (dRows === -1) ? 'top' :
        (dCols === 1) ? 'right' : (dCols === -1) ? 'left' : null;
    if(!direction) return {grid: oldGrid, pill, didMove: false};

    const canMove = _.every(pillNeighbors(oldGrid, pill)[direction], isEmpty);
    if(!canMove) return {grid: oldGrid, pill, didMove: false};

    var grid = oldGrid.slice();
    var pillSegments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);

    if(Math.abs(dRows) > 0) {
        _.each(pill, ([segRow, segCol], i) => {
            let pillRow = grid[segRow].slice();
            let newRow = grid[segRow + dRows].slice();
            newRow[segCol] = pillSegments[i];
            pillRow[segCol] = emptyObject();
            grid[segRow] = pillRow;
            grid[segRow + dRows] = newRow;
        });
    } else if(Math.abs(dCols) > 0) {
        _.each(pill, ([segRow, segCol], i) => {
            let newRow = grid[segRow].slice();
            newRow[segCol + dCols] = pillSegments[i];
            newRow[segCol] = emptyObject();
            grid[segRow] = newRow;
        });
    }

    const newPill = [[pill[0][0] + dRows, pill[0][1] + dCols], [pill[1][0] + dRows, pill[1][1] + dCols]];
    return {grid, pill: newPill, didMove: true};
}

function movePill2(oldGrid, pill, direction) {
    //const direction =
    //    (dRows === 1) ? 'bottom' : (dRows === -1) ? 'top' :
    //    (dCols === 1) ? 'right' : (dCols === -1) ? 'left' : null;
    const dRows = (direction === 'bottom') ? 1 : (direction === 'top') ? -1 : 0;
    const dCols = (direction === 'right') ? 1 : (direction === 'left') ? -1 : 0;
    if(Math.abs(dRows) + Math.abs(dCols) == 0) throw "invalid direction";
    if(!direction) return {grid: oldGrid, pill, didMove: false};

    const canMove = _.every(pillNeighbors(oldGrid, pill)[direction], isEmpty);
    if(!canMove) return {grid: oldGrid, pill, didMove: false};

    var grid = oldGrid.slice();
    var pillSegments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);

    if(Math.abs(dRows) > 0) {
        if(isPillVertical(grid, pill)) {
            let newRowIndices = pill.map(([segRowI, segColI]) => segRowI + dRows);
            let newRows = newRowIndices.map(rowI => grid[rowI].slice());
            let emptyRowI = (dRows > 0) ? pill[0][0] : pill[1][0];
            let emptyRow = grid[emptyRowI];

            pill.forEach(([segRowI, segColI], j) => newRows[j][segColI] = pillSegments[j]);
            emptyRow[pill[0][1]] = emptyObject();
            newRowIndices.forEach((newRowI, j) => grid[newRowI] = newRows[j]);
            grid[emptyRowI] = emptyRow;
        } else {
            let newRowI = pill[0][0] + dRows;
            let newRow = grid[newRowI].slice();
            let emptyRowI = pill[0][0];
            let emptyRow = grid[emptyRowI].slice();

            [0,1].forEach(pillSegI => {
                newRow[pill[pillSegI][1]] = pillSegments[pillSegI];
                emptyRow[pill[pillSegI][1]] = emptyObject();
            });
            grid[newRowI] = newRow;
            grid[emptyRowI] = emptyRow;
        }
    } else if(Math.abs(dCols) > 0) {
    }

    const newPill = [[pill[0][0] + dRows, pill[0][1] + dCols], [pill[1][0] + dRows, pill[1][1] + dCols]];
    return {grid, pill: newPill, didMove: true};
}

function movePill3(oldGrid, pill, direction) {
    const dRows = (direction === 'bottom') ? 1 : (direction === 'top') ? -1 : 0;
    const dCols = (direction === 'right') ? 1 : (direction === 'left') ? -1 : 0;
    if(Math.abs(dRows) + Math.abs(dCols) == 0) throw "invalid direction";
    if(!direction) return {grid: oldGrid, pill, didMove: false};

    const canMove = _.every(pillNeighbors(oldGrid, pill)[direction], isEmpty);
    if(!canMove) return {grid: oldGrid, pill, didMove: false};

    var grid = oldGrid.slice();
    var pillSegments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);

    if(Math.abs(dRows) > 0) {
        grid[pill[0][0] + dRows][pill[0][1]] = pillSegments[0];
        grid[pill[1][0] + dRows][pill[1][1]] = pillSegments[1];

        let emptyRowI = (isPillVertical(oldGrid, pill) && dRows < 0) ? pill[1][0] : pill[0][0];
        grid[emptyRowI][pill[0][1]] = emptyObject();
        grid[emptyRowI][pill[1][1]] = emptyObject(); // if vertical this will be the same as last line

    } else if(Math.abs(dCols) > 0) {
        grid[pill[0][0]][pill[0][1] + dCols] = pillSegments[0];
        grid[pill[1][0]][pill[1][1] + dCols] = pillSegments[1];

        let emptyColI = ((!isPillVertical(oldGrid, pill)) && dCols < 0) ? pill[1][1] : pill[0][1];
        grid[pill[0][0]][emptyColI] = emptyObject();
        grid[pill[1][0]][emptyColI] = emptyObject();
    }

    const newPill = [[pill[0][0] + dRows, pill[0][1] + dCols], [pill[1][0] + dRows, pill[1][1] + dCols]];
    return {grid, pill: newPill, didMove: true};
}



function lowerPill(oldGrid, pill) {
    //return movePill(oldGrid, pill, 1, 0);
    return movePill3(oldGrid, pill, 'bottom');
}

function checkCanMove(grid, pill, direction) {
    return _.every(pillNeighbors(grid, pill)[direction], isEmpty);
}

function moveLeft(oldGrid, pill) {
    return movePill3(oldGrid, pill, 'left');
    //if(!checkCanMove(oldGrid, pill, 'left')) return {grid: oldGrid, pill, didMove: false};
    //
    //var grid = oldGrid.slice();
    //var pillSegments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);
    //
    //if(isPillVertical(grid, pill)) {
    //    _.each(pill, ([segRow, segCol], i) => {
    //        let newRow = grid[segRow].slice();
    //        newRow[segCol - 1] = pillSegments[i];
    //        newRow[segCol] = emptyObject();
    //        grid[segRow] = newRow;
    //    });
    //} else {
    //    let newRow = grid[pill[0][0]].slice();
    //    newRow[pill[0][1] - 1] = pillSegments[0];
    //    newRow[pill[1][1] - 1] = pillSegments[1];
    //    newRow[pill[1][1]] = emptyObject();
    //    grid[pill[0][0]] = newRow;
    //}
    //const newPill = [[pill[0][0], pill[0][1] -1], [pill[1][0], pill[1][1]-1]];
    //return {grid, pill: newPill, didMove: true};
}

function moveRight(oldGrid, pill) {
    return movePill3(oldGrid, pill, 'right');
    //if(!checkCanMove(oldGrid, pill, 'right')) return {grid: oldGrid, pill, didMove: false};
    //
    //var grid = oldGrid.slice();
    //var pillSegments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);
    //
    //if(isPillVertical(grid, pill)) {
    //    _.each(pill, ([segRow, segCol], i) => {
    //        let newRow = grid[segRow].slice();
    //        newRow[segCol + 1] = pillSegments[i];
    //        newRow[segCol] = emptyObject();
    //        grid[segRow] = newRow;
    //    });
    //} else {
    //    let newRow = grid[pill[0][0]].slice();
    //    newRow[pill[0][1] + 1] = pillSegments[0];
    //    newRow[pill[1][1] + 1] = pillSegments[1];
    //    newRow[pill[0][1]] = emptyObject();
    //    grid[pill[0][0]] = newRow;
    //}
    //const newPill = [[pill[0][0], pill[0][1] + 1], [pill[1][0], pill[1][1] + 1]];
    //return {grid, pill: newPill, didMove: true};
}