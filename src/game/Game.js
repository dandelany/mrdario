import _  from 'lodash';
import {EventEmitter} from 'events';
import keyMirror from 'keymirror';
import StateMachine  from 'javascript-state-machine';

import { GRID_OBJECTS, INPUTS, COLORS, GRAVITY_TABLE } from './../constants';
import {Playfield, generatePillSequence} from './Playfield';

const MODES = keyMirror({
    LOADING: null, // use this time to populate viruses slowly like in real game?
    READY: null, // ready for a new pill
    PLAYING: null, // pill is in play and falling
    RECONCILE: null, // pill is locked in place, checking for lines to destroy
    CASCADE: null, // cascading line destruction & debris falling
    DESTRUCTION: null, // lines are being destroyed
    ENDED: null // game has ended
});

export default class Game extends EventEmitter {
    constructor({
            width = 8, height = 16, baseSpeed = 15, cascadeSpeed = 15,
            level = 0,
            destroyTicks = 20,
            onChange = _.noop, onWin = _.noop, onLose = _.noop,
            pillSequence = generatePillSequence(COLORS)
        } = {}) {

        super();
        _.assign(this, {
            // finite state machine representing game mode
            modeMachine: StateMachine.create({
                initial: MODES.LOADING,
                events: [ // transitions between states
                    {name: 'loaded', from: MODES.LOADING, to: MODES.READY},
                    {name: 'play', from: MODES.READY, to: MODES.PLAYING},
                    {name: 'reconcile', from: [MODES.PLAYING, MODES.CASCADE], to: MODES.RECONCILE},
                    {name: 'destroy', from: MODES.RECONCILE, to: MODES.DESTRUCTION},
                    {name: 'cascade', from: [MODES.RECONCILE, MODES.DESTRUCTION], to: MODES.CASCADE},
                    {name: 'ready', from: MODES.CASCADE, to: MODES.READY},
                    {name: 'win', from: MODES.RECONCILE, to: MODES.ENDED},
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
            // current virus level
            level,
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
            playfield: new Playfield({width, height})
        });

        //this.modeMachine.onenterstate = (event, lastMode, newMode) => {
        //    console.log('playfield mode transition:', event, lastMode, newMode);
        //};
        //this.modeMachine.onreset = (event, lastMode, newMode) => {};
        this.modeMachine.onplay = () => this.counters.playTicks = 0;
        this.modeMachine.ondestroy = () => this.counters.destroyTicks = 0;
        this.modeMachine.oncascade = () => this.counters.cascadeTicks = 0;
        this.modeMachine.onwin = () => this.onWin();
        this.modeMachine.onlose = () => this.onLose();
    }

    handleInput(input) {
        if(_.includes([INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN], input)) {
            let direction = (input === INPUTS.DOWN) ? 'down' :
                (input === INPUTS.LEFT) ? 'left' : 'right';
            this.playfield.movePill(direction);

        } else if(_.includes([INPUTS.ROTATE_CCW, INPUTS.ROTATE_CW], input)) {
            let direction = (input === INPUTS.ROTATE_CCW) ? 'ccw' : 'cw';
            this.playfield.rotatePill(direction);
        }
    }

    tick(inputQueue) {
        // the main game loop, called once per game tick
        switch (this.modeMachine.current) {
            case MODES.LOADING:
                this.playfield.generateViruses(this.level);
                this.modeMachine.loaded();
                break;

            case MODES.READY:
                // try to add a pill to the playfield
                if(this.givePill()) this.modeMachine.play();
                // if it didn't work, pill entrance is blocked and we lose
                else this.modeMachine.lose();
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
                    const didMove = this.playfield.movePill('down');
                    if(!didMove) this.modeMachine.reconcile();
                }

                break;

            case MODES.RECONCILE:
                // playfield is locked, check for same-color lines
                const hadLines = this.playfield.destroyLines();
                const hasViruses = this.playfield.hasViruses();

                if(!hasViruses) this.modeMachine.win(); // killed all viruses, you win
                else if(hadLines) this.modeMachine.destroy(); // destroy the marked lines
                else this.modeMachine.cascade(); // no lines, cascade falling debris
                break;

            case MODES.DESTRUCTION:
                // stay in destruction state a few ticks to animate destruction
                if(this.counters.destroyTicks >= this.destroyTicks) {
                    // empty the destroyed cells
                    this.playfield.removeDestroyed();
                    this.modeMachine.cascade();
                }
                this.counters.destroyTicks++;
                break;

            case MODES.CASCADE:

                if(this.counters.cascadeTicks === 0) {
                    // check if there is any debris to drop
                    let {fallingCells} = this.playfield.flagFallingCells();
                    // nothing to drop, ready for another pill
                    if(!fallingCells.length) this.modeMachine.ready();

                } else if(this.counters.cascadeTicks % this.cascadeGravity === 0) {
                    // drop the cells for the current cascade
                    const dropped = this.playfield.dropDebris();
                    // compute the next cascade
                    // flag falling cells for next cascade so they are excluded by reconciler
                    // (falling pieces cant make lines)
                    const next = this.playfield.flagFallingCells();

                    if(next.fallingCells.length < dropped.fallingCells.length) {
                        // some of the falling cells from this cascade have stopped
                        // so we need to reconcile them (look for lines)
                        this.modeMachine.reconcile();
                    }
                }
                this.counters.cascadeTicks++;
                break;

            case MODES.ENDED:
                console.log('ended!');
                break;
        }
    }

    givePill() {
        const pillColors = this.pillSequence[this.counters.pillSequenceIndex];
        // try to add a new pill, false if blocked
        const didGive = this.playfield.givePill(pillColors);

        if(didGive) {
            this.counters.pillSequenceIndex++; // todo no need to save this it can be derived from pillcount % length
            if(this.counters.pillSequenceIndex == this.pillSequence.length) this.counters.pillSequenceIndex = 0;
            this.counters.pillCount++;
        }
        return didGive;
    }
}

function gravityFrames(speed) { return GRAVITY_TABLE[Math.min(speed, GRAVITY_TABLE.length - 1)]; }