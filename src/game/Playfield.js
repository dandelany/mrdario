import _  from 'lodash';
import {EventEmitter} from 'events';
import keyMirror from 'keymirror';
import StateMachine  from 'javascript-state-machine';
import { GRID_OBJECTS, INPUTS, COLORS } from './../constants';

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
    LOADING: null, // use this time to populate viruses slowly like in real game?
    READY: null, // ready for a new pill
    PLAYING: null, // pill is in play and falling
    RECONCILE: null, // pill is locked in place, checking for lines to destroy
    CASCADE: null, // cascading line destruction & debris falling
    DESTRUCTION: null, // lines are being destroyed
    ENDED: null // game has ended
});

export default class Playfield extends EventEmitter {
    constructor({
            width = 8, height = 12, baseSpeed = 15, cascadeSpeed = 15,
            destroyTicks = 20,
            onChange = _.noop, onWin = _.noop, onLose = _.noop,
            pillSequence = generatePillSequence(COLORS)
        }) {
        super();
        _.assign(this, {
            // finite state machine representing playfield mode
            modeMachine: StateMachine.create({
                initial: MODES.LOADING,
                events: [
                    {name: 'loaded', from: MODES.LOADING, to: MODES.READY},
                    {name: 'play', from: MODES.READY, to: MODES.PLAYING},
                    {name: 'reconcile', from: [MODES.PLAYING, MODES.CASCADE], to: MODES.RECONCILE},
                    {name: 'destroy', from: MODES.RECONCILE, to: MODES.DESTRUCTION},
                    {name: 'cascade', from: [MODES.RECONCILE, MODES.DESTRUCTION], to: MODES.CASCADE},
                    {name: 'ready', from: MODES.CASCADE, to: MODES.READY},
                    {name: 'win', from: MODES.CASCADE, to: MODES.ENDED},
                    {name: 'lose', from: MODES.READY, to: MODES.ENDED},
                    {name: 'reset', from: '*', to: MODES.LOADING}
                ]
            }),
            // callbacks called when grid changes, game is won, or game is lost
            onChange, onWin, onLose,
            // width and height of grid
            width, height,
            // increments every 10 capsules to speed up over time
            speedCounter: 0,
            // value representing pill fall speed, increases over time
            playSpeed: baseSpeed,
            // lookup speed in gravityTable to get # of frames it takes to fall 1 row
            playGravity: gravityFrames(baseSpeed),
            // debris fall speed, constant
            cascadeSpeed,
            // # of frames it takes debris to fall 1 row during cascade
            cascadeGravity: gravityFrames(cascadeSpeed),
            // # of frames pills being destroyed are in the "destroyed" state before cascading
            destroyTicks,

            // counters, mostly used to count # of frames we've been in a particular state
            counters: {
                playTicks: 0,
                cascadeTicks: 0,
                destroyTicks: 0
            },

            // the grid, single source of truth for game state
            grid: emptyGrid(width, height)
        });

        this.modeMachine.onenterstate = (event, lastMode, newMode) => {
            console.log('playfield mode transition:', event, lastMode, newMode);
        };
        this.modeMachine.onreset = (event, lastMode, newMode) => {};
        this.modeMachine.onplay = () => this.counters.playTicks = 0;
        this.modeMachine.ondestroy = () => this.counters.destroyTicks = 0;
        this.modeMachine.oncascade = () => this.counters.cascadeTicks = 0;
        this.modeMachine.onwin = () => this.onWin();
        this.modeMachine.onlose = () => this.onLose();
    }
    tick(inputQueue) {
        // the main game loop, called once per game tick
        switch (this.modeMachine.current) {
            case MODES.LOADING:
                this.modeMachine.loaded();
                break;

            case MODES.READY:
                this.givePill();
                this.modeMachine.play();
                break;

            case MODES.PLAYING:
                // game is playing, pill is falling & under user control
                // todo speedup
                // todo handle holding down buttons better?
                this.counters.playTicks++;

                while(inputQueue.length) {
                    this.handleInput(inputQueue.shift());
                }

                if(this.counters.playTicks > this.playGravity) {
                    this.counters.playTicks = 0;
                    //const didMove = this.movePill('down');
                    const {grid, pill, didMove} = movePill(this.grid, this.pill, 'down');
                    //const {grid, pill, didMove} = moveCells(this.grid, this.pill, 'down');
                    _.assign(this, {grid, pill});
                    if(!didMove) {
                        this.modeMachine.reconcile();
                        //this.modeMachine.ready();
                    }
                }


                break;

            case MODES.RECONCILE:
                // grid is locked, check for same-color lines
                const lines = findLines(this.grid);
                if(lines.length) {
                    // set cells in lines to destroyed
                    _.flatten(lines).forEach(this.destroyCell.bind(this));
                    // turn widowed pill halves into rounded 1-square pill segments
                    findWidows(this.grid).forEach(this.setPillSegment.bind(this));
                    this.modeMachine.destroy();
                } else this.modeMachine.cascade(); // no lines, cascade falling debris
                break;

            case MODES.DESTRUCTION:
                // stay in destruction state a few ticks to animate destruction
                if(this.counters.destroyTicks >= this.destroyTicks) {
                    // empty the destroyed cells
                    this.removeDestroyed();
                    this.modeMachine.cascade();
                }
                this.counters.destroyTicks++;
                break;

            case MODES.CASCADE:
                // todo make debris fall
                // find lines of 4 or more same colors in a row
                console.log('CASCADING!!');
                this.modeMachine.ready();
                break;
        }
    }

    handleInput(input) {
        console.log('got input', input);
        if(_.includes([INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN], input)) {
            let direction = (input === INPUTS.LEFT) ? 'left' :
                            (input === INPUTS.RIGHT) ? 'right' : 'down';
            //this.movePill(direction);
            const {grid, pill, didMove} = movePill(this.grid, this.pill, direction);
            //const {grid, pill, didMove} = moveCells(this.grid, this.pill, direction);
            _.assign(this, {grid, pill});

        } else if(_.includes([INPUTS.ROTATE_LEFT, INPUTS.ROTATE_RIGHT], input)) {
            let direction = (input === INPUTS.ROTATE_LEFT) ? 'left' : 'right';
            this.rotatePill(direction);
        }
    }

    emptyGrid() {

    }
    populateViruses() {

    }

    givePill() {
        // todo: if entry place is blocked, lose the game

        // add new pill to grid
        let row = this.grid[0];
        const pillCol = Math.floor(row.length / 2) - 1;

        row[pillCol] = {type: GRID_OBJECTS.PILL_LEFT, color: COLORS[0]};
        row[pillCol+1] = {type: GRID_OBJECTS.PILL_RIGHT, color: COLORS[1]};
        this.pill = [[0, pillCol], [0, pillCol+1]];
    }

    movePill(direction) {
        let {grid, pill} = this;
        const dRow = (direction === 'down') ? 1 : (direction === 'up') ? -1 : 0;
        const dCol = (direction === 'right') ? 1 : (direction === 'left') ? -1 : 0;
        if(Math.abs(dRow) + Math.abs(dCol) == 0) throw "invalid direction";
        if(!direction) return false;

        if(!canPillMove(grid, pill, direction)) return false;

        var pillSegments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);

        if(Math.abs(dRow) > 0) { // move up or down
            grid[pill[0][0] + dRow][pill[0][1]] = pillSegments[0];
            grid[pill[1][0] + dRow][pill[1][1]] = pillSegments[1];

            let emptyRowI = (isPillVertical(grid, pill) && dRow < 0) ? pill[1][0] : pill[0][0];
            grid[emptyRowI][pill[0][1]] = emptyObject();
            grid[emptyRowI][pill[1][1]] = emptyObject();

        } else if(Math.abs(dCol) > 0) { // move left or right
            grid[pill[0][0]][pill[0][1] + dCol] = pillSegments[0];
            grid[pill[1][0]][pill[1][1] + dCol] = pillSegments[1];

            let emptyColI = ((!isPillVertical(grid, pill)) && dCol < 0) ? pill[1][1] : pill[0][1];
            grid[pill[0][0]][emptyColI] = emptyObject();
            grid[pill[1][0]][emptyColI] = emptyObject();
        }

        this.pill = [[pill[0][0] + dRow, pill[0][1] + dCol], [pill[1][0] + dRow, pill[1][1] + dCol]];
        return true;
    }
    rotatePill(direction) {
        // http://tetrisconcept.net/wiki/Dr._Mario#Rotation_system
        const {grid, pill} = this;
        const pillNeighbors = getPillNeighbors(grid, pill);
        const isVertical = isPillVertical(grid, pill);
        const [pillRow, pillCol] = pill[0];

        const segments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);
        const newSegmentTypes = isVertical ?
                [GRID_OBJECTS.PILL_LEFT, GRID_OBJECTS.PILL_RIGHT] : [GRID_OBJECTS.PILL_TOP, GRID_OBJECTS.PILL_BOTTOM];
        //const newSegments = _.map(segments, (segment, i) => { _.assign({}, segment, newSegmentTypes[i]); });

        if(isVertical) { // vertical to horizontal
            if(!isEmpty(pillNeighbors.right[1])) {
                if(!isEmpty(pillNeighbors.left[1])) return false; // no kick, stuck between blocks
                // todo kick left
            }

            if(direction === 'right') {
                grid[pillRow+1][pillCol] = _.assign({}, segments[1], {type: newSegmentTypes[0]});
                grid[pillRow+1][pillCol+1] = _.assign({}, segments[0], {type: newSegmentTypes[1]});
            } else {
                grid[pillRow+1][pillCol] = _.assign({}, segments[0], {type: newSegmentTypes[0]});
                grid[pillRow+1][pillCol+1] = _.assign({}, segments[1], {type: newSegmentTypes[1]});
            }
            grid[pillRow][pillCol] = emptyObject();
            this.pill = [[pillRow+1, pillCol], [pillRow+1, pillCol+1]];
            return true;

        } else { // horizontal to vertical
            if(!isEmpty(pillNeighbors.up[0]) || pill[0][0] === 0) return false; // no kick here
            if(direction === 'right') {
                grid[pillRow-1][pillCol] = _.assign({}, segments[0], {type: newSegmentTypes[0]});
                grid[pillRow][pillCol] = _.assign({}, segments[1], {type: newSegmentTypes[1]});
            } else {
                grid[pillRow-1][pillCol] = _.assign({}, segments[1], {type: newSegmentTypes[0]});
                grid[pillRow][pillCol] = _.assign({}, segments[0], {type: newSegmentTypes[1]});
            }
            grid[pillRow][pillCol+1] = emptyObject();
            this.pill = [[pillRow-1, pillCol], [pillRow, pillCol]];
            return true;
        }
    }
    destroyCell([rowI, colI]) {
        // set grid cell to destroyed
        this.grid[rowI][colI] = {type: GRID_OBJECTS.DESTROYED};
    }
    removeCell([rowI, colI]) {
        this.grid[rowI][colI] = emptyObject();
    }
    removeDestroyed() {
        this.grid.forEach((row, rowI) => row.forEach((cell, colI) => {
            const shouldRemove = isDestroyed(this.grid[rowI][colI]);
            if(shouldRemove) this.removeCell([rowI, colI]);
        }))
    }
    setPillSegment([rowI, colI]) {
        // set grid cell to be a rounded pill segment
        this.grid[rowI][colI] = _.assign({}, this.grid[rowI][colI], {type: GRID_OBJECTS.PILL_SEGMENT});
    }
}

function generatePillSequence(colors, count=128) {
    return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
}

const EMPTY_OBJECT = { type: GRID_OBJECTS.EMPTY };

function emptyObject() { return EMPTY_OBJECT; }

function emptyGrid(width, height) {
    return _.times(height, () => _.times(width, emptyObject));
}

function isEmpty(obj) { return obj && obj.type === GRID_OBJECTS.EMPTY; }

function isDestroyed(obj) { return obj && obj.type === GRID_OBJECTS.DESTROYED; }

function isPillVertical(grid, pill) {
    return grid[pill[0][0]][pill[0][1]].type === GRID_OBJECTS.PILL_TOP;
}

function deltaRowCol(direction, distance=1) {
    // return the [dRow, dCol] transformation needed for a move in given direction and distance
    const dRow = (direction === 'down') ? distance : (direction === 'up') ? -distance : 0;
    const dCol = (direction === 'right') ? distance : (direction === 'left') ? -distance : 0;
    if(Math.abs(dRow) + Math.abs(dCol) == 0) throw "invalid direction " + direction;
    return [dRow, dCol];
}

function getCellNeighbors(grid, [rowI, colI]) {
    // returns the neighbors of the grid cell at [rowI, colI]
    return {
        up: (rowI <= 0) ? null : grid[rowI - 1][colI],
        down: (rowI >= grid.length - 1) ? null : grid[rowI + 1][colI],
        left: (colI <= 0) ? null : grid[rowI][colI - 1],
        right: (colI >= grid[0].length - 1) ? null : grid[rowI][colI + 1],
    }
}

function canCellMove(grid, cell, direction) {
    return isEmpty(getCellNeighbors(grid, cell)[direction]);
}

function getPillNeighbors(grid, pill) {
    const isVertical = isPillVertical(grid, pill);
    const neighbors1 = getCellNeighbors(grid, pill[0]);
    const neighbors2 = getCellNeighbors(grid, pill[1]);
    return isVertical ? {
        up: [neighbors1.up],
        down: [neighbors2.down],
        left: [neighbors1.left, neighbors2.left],
        right: [neighbors1.right, neighbors2.right]
    } : {
        up: [neighbors1.up, neighbors2.up],
        down: [neighbors1.down, neighbors2.down],
        left: [neighbors1.left],
        right: [neighbors2.right]
    };
}


function canPillMove(grid, pill, direction) {
    return _.every(getPillNeighbors(grid, pill)[direction], isEmpty);
}

function moveCell(grid, cell, direction) {
    if(!canCellMove(grid, cell, direction)) return {grid, cell, didMove: false};
    const [dRow, dCol] = deltaRowCol(direction);
    const [rowI, colI] = cell;
    grid[rowI + dRow][colI + dCol] = grid[rowI][colI];
    grid[rowI][colI] = emptyObject();
    cell = [rowI + dRow, colI + dCol];
    return {grid, cell, didMove: true}
}

function moveCells(grid, cells, direction) {
    // WARNING mutates the grid
    // move several cells (eg. a pill) at once
    // either they all move, or none of them move
    const [dRow, dCol] = deltaRowCol(direction);
    const oldGrid = grid;
    grid = oldGrid.map(row => row.slice());

    let sortedCells = cells.slice().sort((a, b) => {
        // sort the cells, so when moving eg. down, the furthest cell down moves first
        // this way we don't overwrite newly moved elements
        return Math.abs(dRow) > 0 ? ((b[0] - a[0]) * dRow) : ((b[1] - a[1]) * dCol);
    });

    for(var i=0; i<sortedCells.length; i++) {
        let cell = sortedCells[i];
        let moved = moveCell(grid, cell, direction);
        // move unsuccessful, return original grid
        if(!moved.didMove) return {grid: oldGrid, cells, didMove: false};
        // move successful, update grid
        grid = moved.grid;
    }
    // all moves successful, update (unsorted) cells with new locations
    const newCells = cells.map(([rowI, colI]) => [rowI + dRow, colI + dCol]);
    return {grid, cells: newCells, didMove: true};
}

function movePill(grid, pill, direction) {
    // WARNING mutates the grid
    // todo make pure/immutable
    //if(!canPillMove(grid, pill, direction)) return {grid, pill, didMove: false};
    //
    //const [dRow, dCol] = deltaRowCol(direction);
    //const pillSegments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);
    //const [[pill1RowI, pill1ColI], [pill2RowI, pill2ColI]] = pill;
    //
    let cells, didMove;
    ({grid, cells, didMove} = moveCells(grid, pill, direction));
    return {grid, pill: cells, didMove};



    //if(Math.abs(dRow) > 0) { // move up or down
    //    grid[pill1RowI + dRow][pill1ColI] = pillSegments[0];
    //    grid[pill2RowI + dRow][pill2ColI] = pillSegments[1];
    //
    //    let emptyRowI = (isPillVertical(grid, pill) && dRow < 0) ? pill2RowI : pill1RowI;
    //    grid[emptyRowI][pill1ColI] = emptyObject();
    //    grid[emptyRowI][pill2ColI] = emptyObject();
    //
    //} else if(Math.abs(dCol) > 0) { // move left or right
    //    grid[pill1RowI][pill1ColI + dCol] = pillSegments[0];
    //    grid[pill2RowI][pill2ColI + dCol] = pillSegments[1];
    //
    //    let emptyColI = ((!isPillVertical(grid, pill)) && dCol < 0) ? pill2ColI : pill1ColI;
    //    grid[pill1RowI][emptyColI] = emptyObject();
    //    grid[pill2RowI][emptyColI] = emptyObject();
    //}

    pill = [[pill1RowI + dRow, pill1ColI + dCol], [pill2RowI + dRow, pill2ColI + dCol]];
    return {grid, pill, didMove: true};
}

// the main reconcile function, looks for lines of 4 or more of the same color in the grid
function findLines(grid, lineLength = 4) {
    const horizontalLines = _(grid).map((row, rowI) => {
        return findLinesIn(row, lineLength).map(line => line.map(colI => [rowI, colI]));
    }).flatten().value();

    // reslice grid into [col][row] instead of [row][col] format to check columns
    const gridCols = _.range(grid[0].length).map(colI => grid.map(row => row[colI]));
    const verticalLines = _(gridCols).map((col, colI) => {
        return findLinesIn(col, lineLength).map(line => line.map(rowI => [rowI, colI]));
    }).flatten().value();

    console.log('lines:', horizontalLines, verticalLines);
    return horizontalLines.concat(verticalLines);
}

// find same-color lines within a single row or column
function findLinesIn(row, lineLength = 4) {
    let lastColor = undefined;
    let curLine = [];
    return _.reduce(row, (result, cell, i) => {
        const color = cell.color;
        if(color != lastColor) {
            // different color, end the current line and add to result if long enough
            if(curLine.length >= lineLength) result.push(curLine);
            curLine = [];
        }
        // add to current line if non-empty
        if(!_.isUndefined(color)) curLine.push(i);
        // end of row, add last line to result if long enough
        if(i == row.length-1 && (curLine.length >= lineLength)) result.push(curLine);

        lastColor = color;
        return result;
    }, []);
}

// find "widows", half-pill pieces whose other halves have been destroyed
function findWidows(grid) {
    const {PILL_LEFT, PILL_RIGHT, PILL_TOP, PILL_BOTTOM} = GRID_OBJECTS;
    const pillTypes = [PILL_LEFT, PILL_RIGHT, PILL_TOP, PILL_BOTTOM];

    return _.flatten(grid.reduce((widows, row, rowI) => {
        widows.push(row.reduce((rowWidows, cell, colI) => {
            const type = cell.type;
            if(!_.includes(pillTypes, type)) return rowWidows;

            var neighbors = getCellNeighbors(grid, [rowI, colI]);
            var isWidow =
                ((type === PILL_LEFT) && (!neighbors.right || neighbors.right.type != PILL_RIGHT)) ||
                ((type === PILL_RIGHT) && (!neighbors.left || neighbors.left.type != PILL_LEFT)) ||
                ((type === PILL_TOP) && (!neighbors.down || neighbors.down.type != PILL_BOTTOM)) ||
                ((type === PILL_BOTTOM) && (!neighbors.up || neighbors.up.type != PILL_TOP));

            if(isWidow) rowWidows.push([rowI, colI]);
            return rowWidows;
        }, []));
        return widows;
    }, []));
}

// find pieces in the grid which are unsupported and should fall in cascade
function findFallingDebris(grid) {

}
