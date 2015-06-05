import _  from 'lodash';
import {EventEmitter} from 'events';
import keyMirror from 'keymirror';
import StateMachine  from 'javascript-state-machine';
import { GRID_OBJECTS, INPUTS, COLORS, GRAVITY_TABLE } from './../constants';

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
// the functions which make up the core game logic
import * as game from './gameFunctions';

const {Grid, generatePillSequence} = game;

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
                events: [ // transitions between states
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
            // sequence of pill colors to use
            pillSequence,
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
                destroyTicks: 0,
                pillSequenceIndex: 0,
                pillCount: 0
            },

            // the grid, single source of truth for game state
            grid: new Grid({width, height})
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
                    const didMove = this.movePill('down');
                    if(!didMove) {
                        this.modeMachine.reconcile();
                    }
                }

                break;

            case MODES.RECONCILE:
                // grid is locked, check for same-color lines
                const hadLines = this.grid.destroyLines();
                if(hadLines) this.modeMachine.destroy();
                else this.modeMachine.cascade(); // no lines, cascade falling debris
                // todo win if viruses are gone

                //const lines = findLines(this.grid);
                //if(lines.length) {
                //    // set cells in lines to destroyed
                //    _.flatten(lines).forEach(this.destroyCell.bind(this));
                //    // turn widowed pill halves into rounded 1-square pill segments
                //    findWidows(this.grid).forEach(this.setPillSegment.bind(this));
                //    this.modeMachine.destroy();
                //    // todo win if viruses are gone
                //} else this.modeMachine.cascade();
                break;

            case MODES.DESTRUCTION:
                // stay in destruction state a few ticks to animate destruction
                if(this.counters.destroyTicks >= this.destroyTicks) {
                    // empty the destroyed cells
                    this.grid.removeDestroyed();
                    this.modeMachine.cascade();
                }
                this.counters.destroyTicks++;
                break;

            case MODES.CASCADE:

                if(this.counters.cascadeTicks === 0) {
                    // check if there is any debris to drop
                    let {fallingCells} = this.grid.flagFallingCells(this.grid);

                    // nothing to drop, ready for another pill
                    if(!fallingCells.length) this.modeMachine.ready();

                    //if(!fallingCells.length) {
                    //    this.modeMachine.ready();
                    //    //return;
                    //} else this.fallingCells = fallingCells;
                } else if(this.counters.cascadeTicks % this.cascadeGravity === 0) {
                    // drop the cells for the current cascade
                    const dropped = this.grid.dropDebris();
                    // compute the next cascade
                    // flag falling cells for next cascade so they are excluded by reconciler
                    // (falling pieces cant make lines)
                    const next = this.grid.flagFallingCells();

                    if(next.fallingCells.length < dropped.fallingCells.length) {
                        // some of the falling cells from this cascade have stopped
                        // so we need to reconcile them (look for lines)
                        this.modeMachine.reconcile();
                    }
                }


                //if(this.counters.cascadeTicks % this.cascadeGravity === 0) {
                //    let {fallingCells, grid} = dropDebris(this.grid); // check if there is debris to drop
                //    if(!fallingCells.length) { // nothing to drop, ready for another pill
                //        this.modeMachine.ready();
                //        return;
                //    }
                //
                //    if(this.counters.cascadeTicks !== 0) {
                //        // if not the first cascade frame, actually move the falling pieces
                //        _.assign(this, {grid});
                //        // look ahead to next cascade to check if we need to reconcile
                //        let nextCascade = dropDebris(grid);
                //        if(nextCascade.fallingCells.length < fallingCells.length) {
                //            // some of the falling cells from this cascade have stopped
                //            // so we need to reconcile them (look for lines)
                //            // mark falling pieces so we ignore them during reconcile (falling pieces cant make lines)
                //            // mutates grid
                //
                //            //this.grid.forEach((row, i) => console.log(row));
                //            this.grid.forEach((row, i) => row.forEach((col, j) => this.grid[i][j].isFalling = false));
                //            nextCascade.fallingCells.forEach(([i, j]) => this.grid[i][j].isFalling = true);
                //            console.log(this.grid);
                //            this.modeMachine.reconcile();
                //            return;
                //        }
                //    }
                //}
                this.counters.cascadeTicks++;
                break;
        }
    }

    handleInput(input) {
        console.log('got input', input);
        if(_.includes([INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN], input)) {
            let direction = (input === INPUTS.LEFT) ? 'left' :
                            (input === INPUTS.RIGHT) ? 'right' : 'down';
            this.movePill(direction);

        } else if(_.includes([INPUTS.ROTATE_CCW, INPUTS.ROTATE_CW], input)) {
            let direction = (input === INPUTS.ROTATE_CCW) ? 'ccw' : 'cw';
            this.rotatePill(direction);
        }
    }

    givePill() {
        // todo: if entry place is blocked, lose the game
        // todo move to immutable pure function

        // add new pill to grid
        //
        //let row = this.grid[0];
        //const pillCol = Math.floor(row.length / 2) - 1;
        //const pillColors = this.pillSequence[this.counters.pillSequenceIndex];
        //
        //row[pillCol] = _.assign({type: GRID_OBJECTS.PILL_LEFT}, pillColors[0]);
        //row[pillCol+1] = _.assign({type: GRID_OBJECTS.PILL_RIGHT}, pillColors[1]);
        //this.pill = [[0, pillCol], [0, pillCol+1]];

        //givePill();

        const pillColors = this.pillSequence[this.counters.pillSequenceIndex];
        console.log('pill comin in')
        //const {grid, pill} = givePill(this.grid, pillColors);
        //_.assign(this, {grid, pill});

        this.grid.givePill(pillColors);
        //return didMove;

        this.counters.pillSequenceIndex++; // todo no need to save this it can be derived from pillcount % length
        if(this.counters.pillSequenceIndex == this.pillSequence.length) this.counters.pillSequenceIndex = 0;
        this.counters.pillCount++;
    }

    movePill(direction) {
        const didMove = this.grid.movePill(direction);
        //if(didMove) _.assign(this, {grid, pill});
        return didMove;
    }
    rotatePill(direction) {

        const didMove = this.grid.rotatePill(direction);
        return didMove;

        // todo move to pure function
        // todo rename to 'cw' and 'ccw' rather than left and right
        // http://tetrisconcept.net/wiki/Dr._Mario#Rotation_system
        //const {grid, pill} = this;
        //// todo refactor to get rid of getPillNeighbors
        //const pillNeighbors = getPillNeighbors(grid, pill);
        //const isVertical = isPillVertical(grid, pill);
        //const [pillRow, pillCol] = pill[0];
        //
        //const segments = _.map(pill, ([segRow, segCol]) => grid[segRow][segCol]);
        //const newSegmentTypes = isVertical ?
        //        [GRID_OBJECTS.PILL_LEFT, GRID_OBJECTS.PILL_RIGHT] : [GRID_OBJECTS.PILL_TOP, GRID_OBJECTS.PILL_BOTTOM];
        ////const newSegments = _.map(segments, (segment, i) => { _.assign({}, segment, newSegmentTypes[i]); });
        //
        //if(isVertical) { // vertical to horizontal
        //    if(!isEmpty(pillNeighbors.right[1])) {
        //        if(!isEmpty(pillNeighbors.left[1])) return false; // no kick, stuck between blocks
        //        // todo kick left
        //    }
        //
        //    if(direction === 'right') {
        //        grid[pillRow+1][pillCol] = _.assign({}, segments[1], {type: newSegmentTypes[0]});
        //        grid[pillRow+1][pillCol+1] = _.assign({}, segments[0], {type: newSegmentTypes[1]});
        //    } else {
        //        grid[pillRow+1][pillCol] = _.assign({}, segments[0], {type: newSegmentTypes[0]});
        //        grid[pillRow+1][pillCol+1] = _.assign({}, segments[1], {type: newSegmentTypes[1]});
        //    }
        //    grid[pillRow][pillCol] = emptyObject();
        //    this.pill = [[pillRow+1, pillCol], [pillRow+1, pillCol+1]];
        //    return true;
        //
        //} else { // horizontal to vertical
        //    if(!isEmpty(pillNeighbors.up[0]) || pill[0][0] === 0) return false; // no kick here
        //    if(direction === 'right') {
        //        grid[pillRow-1][pillCol] = _.assign({}, segments[0], {type: newSegmentTypes[0]});
        //        grid[pillRow][pillCol] = _.assign({}, segments[1], {type: newSegmentTypes[1]});
        //    } else {
        //        grid[pillRow-1][pillCol] = _.assign({}, segments[1], {type: newSegmentTypes[0]});
        //        grid[pillRow][pillCol] = _.assign({}, segments[0], {type: newSegmentTypes[1]});
        //    }
        //    grid[pillRow][pillCol+1] = emptyObject();
        //    this.pill = [[pillRow-1, pillCol], [pillRow, pillCol]];
        //    return true;
        //}
    }
    //destroyCell([rowI, colI]) {
    //    // set grid cell to destroyed
    //    this.grid[rowI][colI] = {type: GRID_OBJECTS.DESTROYED};
    //}
    //removeCell([rowI, colI]) {
    //    this.grid[rowI][colI] = emptyObject();
    //}
    //removeDestroyed() {
    //    this.grid.forEach((row, rowI) => row.forEach((cell, colI) => {
    //        const shouldRemove = isDestroyed(this.grid[rowI][colI]);
    //        if(shouldRemove) this.removeCell([rowI, colI]);
    //    }))
    //}
    //setPillSegment([rowI, colI]) {
    //    // set grid cell to be a rounded pill segment
    //    this.grid[rowI][colI] = _.assign({}, this.grid[rowI][colI], {type: GRID_OBJECTS.PILL_SEGMENT});
    //}
}

//function generatePillSequence(colors, count=128) {
//    return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
//}
//
//const EMPTY_OBJECT = { type: GRID_OBJECTS.EMPTY };
//
//function emptyObject() { return EMPTY_OBJECT; }
//
//function emptyGrid(width, height) {
//    return _.times(height, () => _.times(width, emptyObject));
//}
//
//function isEmpty(obj) { return obj && obj.type === GRID_OBJECTS.EMPTY; }
//
//function isDestroyed(obj) { return obj && obj.type === GRID_OBJECTS.DESTROYED; }
//
//function isPillVertical(grid, pill) {
//    return grid[pill[0][0]][pill[0][1]].type === GRID_OBJECTS.PILL_TOP;
//}
//
//function deltaRowCol(direction, distance=1) {
//    // return the [dRow, dCol] transformation needed for a move in given direction and distance
//    const dRow = (direction === 'down') ? distance : (direction === 'up') ? -distance : 0;
//    const dCol = (direction === 'right') ? distance : (direction === 'left') ? -distance : 0;
//    if(Math.abs(dRow) + Math.abs(dCol) == 0) throw "invalid direction " + direction;
//    return [dRow, dCol];
//}
//
//function getCellNeighbors(grid, [rowI, colI]) {
//    // returns the neighbors of the grid cell at [rowI, colI]
//    return {
//        up: (rowI <= 0) ? null : grid[rowI - 1][colI],
//        down: (rowI >= grid.length - 1) ? null : grid[rowI + 1][colI],
//        left: (colI <= 0) ? null : grid[rowI][colI - 1],
//        right: (colI >= grid[0].length - 1) ? null : grid[rowI][colI + 1],
//    }
//}
//
//function canMoveCell(grid, cell, direction) {
//    return isEmpty(getCellNeighbors(grid, cell)[direction]);
//}
//
//function canMovePill(grid, pill, direction) {
//    return _.every(getPillNeighbors(grid, pill)[direction], isEmpty);
//}
//
//// todo implement canMoveCells for an arbitrary set of cells?
//// then get rid of canPillMove and getPillNeighbors
//
//
//function getPillNeighbors(grid, pill) {
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
//
//
//function moveCell(grid, cell, direction) {
//    if(!canMoveCell(grid, cell, direction)) return {grid, cell, didMove: false};
//    const [dRow, dCol] = deltaRowCol(direction);
//    const [rowI, colI] = cell;
//    grid[rowI + dRow][colI + dCol] = grid[rowI][colI];
//    grid[rowI][colI] = emptyObject();
//    cell = [rowI + dRow, colI + dCol];
//    return {grid, cell, didMove: true}
//}
//
//function moveCells(grid, cells, direction) {
//    // WARNING mutates the grid, todo: make pure/immutable
//    // move a set of cells (eg. a pill) at once
//    // either they all move, or none of them move
//    const [dRow, dCol] = deltaRowCol(direction);
//    let newGrid = grid.map(row => row.slice());
//
//    let sortedCells = cells.slice().sort((a, b) => {
//        // sort the cells, so when moving eg. down, the furthest cell down moves first
//        // this way we don't overwrite newly moved elements
//        return Math.abs(dRow) > 0 ? ((b[0] - a[0]) * dRow) : ((b[1] - a[1]) * dCol);
//    });
//
//    for(var i=0; i<sortedCells.length; i++) {
//        let cell = sortedCells[i];
//        let moved = moveCell(newGrid, cell, direction);
//        // move unsuccessful, return original grid
//        if(!moved.didMove) return {grid, cells, didMove: false};
//        // move successful
//        newGrid = moved.grid;
//    }
//    // all moves successful, update (unsorted) cells with new locations
//    const newCells = cells.map(([rowI, colI]) => [rowI + dRow, colI + dCol]);
//    return {grid: newGrid, cells: newCells, didMove: true};
//}
//
//function movePill(grid, pill, direction) {
//    const moved = moveCells(grid, pill, direction);
//    return {grid: moved.grid, pill: moved.cells, didMove: moved.didMove};
//}
//
//// the main reconcile function, looks for lines of 4 or more of the same color in the grid
//function findLines(grid, lineLength = 4, excludeFlag = 'isFalling') {
//    const horizontalLines = _(grid).map((row, rowI) => {
//        return findLinesIn(row, lineLength, excludeFlag).map(line => line.map(colI => [rowI, colI]));
//    }).flatten().value();
//
//    // reslice grid into [col][row] instead of [row][col] format to check columns
//    const gridCols = _.range(grid[0].length).map(colI => grid.map(row => row[colI]));
//    const verticalLines = _(gridCols).map((col, colI) => {
//        return findLinesIn(col, lineLength, excludeFlag).map(line => line.map(rowI => [rowI, colI]));
//    }).flatten().value();
//
//    console.log('lines:', horizontalLines, verticalLines);
//    return horizontalLines.concat(verticalLines);
//}
//
//// find same-color lines within a single row or column
//function findLinesIn(row, lineLength = 4, excludeFlag = 'isFalling') {
//    let lastColor = undefined;
//    let curLine = [];
//    return _.reduce(row, (result, cell, i) => {
//        const color = cell.color;
//        const shouldExclude = excludeFlag && !!cell[excludeFlag];
//        if(i > 0 && (color != lastColor || shouldExclude)) {
//            // different color, end the current line and add to result if long enough
//            if(curLine.length >= lineLength) result.push(curLine);
//            curLine = [];
//        }
//        // add cell to current line if non-empty and non-excluded
//        if(!_.isUndefined(color) && !shouldExclude) curLine.push(i);
//        // end of row, add last line to result if long enough
//        if(i == row.length-1 && (curLine.length >= lineLength)) result.push(curLine);
//
//        lastColor = color;
//        return result;
//    }, []);
//}
//
//// find "widows", half-pill pieces whose other halves have been destroyed
//function findWidows(grid) {
//    const {PILL_LEFT, PILL_RIGHT, PILL_TOP, PILL_BOTTOM} = GRID_OBJECTS;
//    const pillTypes = [PILL_LEFT, PILL_RIGHT, PILL_TOP, PILL_BOTTOM];
//
//    return _.flatten(grid.reduce((widows, row, rowI) => {
//        widows.push(row.reduce((rowWidows, cell, colI) => {
//            const type = cell.type;
//            if(!_.includes(pillTypes, type)) return rowWidows;
//
//            var neighbors = getCellNeighbors(grid, [rowI, colI]);
//            var isWidow =
//                ((type === PILL_LEFT) && (!neighbors.right || neighbors.right.type != PILL_RIGHT)) ||
//                ((type === PILL_RIGHT) && (!neighbors.left || neighbors.left.type != PILL_LEFT)) ||
//                ((type === PILL_TOP) && (!neighbors.down || neighbors.down.type != PILL_BOTTOM)) ||
//                ((type === PILL_BOTTOM) && (!neighbors.up || neighbors.up.type != PILL_TOP));
//
//            if(isWidow) rowWidows.push([rowI, colI]);
//            return rowWidows;
//        }, []));
//        return widows;
//    }, []));
//}
//
//// find pieces in the grid which are unsupported and should fall in cascade
//function dropDebris(grid) {
//    // start at the bottom of the grid and move up,
//    // seeing which pieces can fall
//    const oldGrid = grid;
//    grid = grid.map(row => row.slice());
//    let fallingCells = [];
//
//    for(var rowI = grid.length-2; rowI >= 0; rowI--) {
//        const row = grid[rowI];
//        for(var colI = 0; colI < row.length; colI++) {
//            const obj = grid[rowI][colI];
//            let didMove = false;
//            if(obj.type === GRID_OBJECTS.PILL_SEGMENT) {
//                ({grid, didMove} = moveCell(grid, [rowI, colI], 'down'));
//                if(didMove) fallingCells.push([rowI, colI]);
//            } else if(obj.type === GRID_OBJECTS.PILL_LEFT) {
//                ({grid, didMove} = moveCells(grid, [[rowI, colI], [rowI, colI+1]], 'down'));
//                if(didMove) fallingCells.push([rowI, colI], [rowI, colI+1]);
//            } else if(obj.type === GRID_OBJECTS.PILL_TOP) {
//                ({grid, didMove} = moveCells(grid, [[rowI, colI], [rowI+1, colI]], 'down'));
//                if(didMove) fallingCells.push([rowI, colI], [rowI+1, colI]);
//            }
//        }
//    }
//    return {grid, fallingCells};
//}

function generateViruses(grid, level, remainingViruses) {

}