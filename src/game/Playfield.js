const _ = require('lodash');
const modeTransitions = {};
const { GRID_OBJECTS, COLORS } = require('./../constants');
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
            // # of ticks it takes player's pill to fall 1 grid row
            //playTicks: Math.round(36 / baseSpeed),
            // # of ticks it takes falling debris to fall 1 grid row
            //fallTicks: Math.round(36 / dropSpeed),

            // increments every 10 capsules to speed up over time
            speedCounter: 0,
            // value representing pill fall speed, increases over time
            // lookup speed in gravityTable to get # of frames it takes to fall 1 row
            playSpeed: baseSpeed,
            playGravity: gravityFrames(baseSpeed),

            // the grid which track
            grid: emptyGrid(width, height)
        });

        console.log("hello i'm a playfield", this);
        this.modeMachine.onenterstate = function(event, lastMode, newMode) {
            console.log('playfield mode transition:', event, lastMode, newMode);
        }.bind(this);
    }
    tick() {
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
                // add a new pill to the top of the grid
                //const {grid, pill} = givePill(grid);
                _.assign(this, givePill(this.grid));
                console.log(this.grid);
                this.modeMachine.play();
                break;

            case MODES.PLAYING:
                console.log('playing');
                break;

            case MODES.RECONCILE:
                break;
            case MODES.DESTRUCTION:
                break;
            case MODES.CASCADE:
                break;
        }


        //
        //
        //if(!this.playerPill) {
        //    this.tickCount = 0;
        //}
        //
        //if(this.tickCount >= this.playGravity) {
        //    // drop the pill by 1 space
        //    var [x,y] = this.playerPill;
        //    const [lColor, rColor] = this.grid[x][y]
        //}
    }
    emptyGrid() {

    }
    populateViruses() {

    }
}


function emptyGrid(width, height) {
    return _.times(height, () => _.times(width, () => { return {type: GRID_OBJECTS.EMPTY}; }));
}

function givePill(oldGrid) {
    // add new pill to grid
    var grid = oldGrid.slice();
    var row = oldGrid[0].slice();
    var pillX = Math.floor(row.length / 2) - 1;

    row[pillX] = {type: GRID_OBJECTS.PILL_LEFT, color: COLORS.RED};
    row[pillX+1] = {type: GRID_OBJECTS.PILL_RIGHT, color: COLORS.BLUE};
    grid[0] = row;

    return {grid, pill: [pillX, 0]}
}
