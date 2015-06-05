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

        const pillColors = this.pillSequence[this.counters.pillSequenceIndex];

        this.grid.givePill(pillColors);

        this.counters.pillSequenceIndex++; // todo no need to save this it can be derived from pillcount % length
        if(this.counters.pillSequenceIndex == this.pillSequence.length) this.counters.pillSequenceIndex = 0;
        this.counters.pillCount++;
    }

    movePill(direction) {
        const didMove = this.grid.movePill(direction);
        return didMove;
    }
    rotatePill(direction) {
        const didMove = this.grid.rotatePill(direction);
        return didMove;
    }
}

function generateViruses(grid, level, remainingViruses) {


}