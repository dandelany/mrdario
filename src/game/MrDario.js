import _ from 'lodash';
import React from 'react/addons';
import StateMachine from 'javascript-state-machine';

import Playfield from './Playfield';
import PlayerControls from './PlayerControls';

import {
    PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
    MODES, INPUTS, GRID_OBJECTS, COLORS, DEFAULT_KEYS
} from '../constants';

import Immutable from 'immutable';
const {List, Map} = Immutable;

window.Immutable = Immutable;

export default class MrDario {
    constructor({render=_.noop, keyBindings = DEFAULT_KEYS, width = PLAYFIELD_WIDTH, height = PLAYFIELD_HEIGHT}) {
        _.assign(this, {
            width, height, render,
            modeMachine: StateMachine.create({ // finite state machine of game modes
                initial: MODES.LOADING,
                events: [
                    {name: 'loaded', from: MODES.LOADING, to: MODES.TITLE},
                    {name: 'play',   from: MODES.TITLE,   to: MODES.PLAYING},
                    {name: 'pause',  from: MODES.PLAYING, to: MODES.PAUSED},
                    {name: 'resume', from: MODES.PAUSED,  to: MODES.PLAYING},
                    {name: 'win',    from: MODES.PLAYING, to: MODES.WON},
                    {name: 'lose',   from: MODES.PLAYING, to: MODES.LOST},
                    {name: 'reset',  from: ['*'], to: MODES.TITLE}
                ]
            }),
            playfield: new Playfield({
                width, height,
                onWin: this.onGameWin.bind(this),
                onLose: this.onGameLose.bind(this)
            }),
            playerInput: new PlayerControls(keyBindings),
            playInputQueue: []
        });

        this.attachModeEvents();
        this.attachInputEvents();
        this.modeMachine.loaded();
        this.run({});
    }

    attachInputEvents() {
        this.playerInput.on(INPUTS.PLAY, () => this.modeMachine.play());
        this.playerInput.on(INPUTS.PAUSE, () => this.modeMachine.pause());
        this.playerInput.on(INPUTS.RESUME, () => this.modeMachine.resume());
        this.playerInput.on(INPUTS.RESET, () => this.modeMachine.reset());

        const playInputs = [INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN, INPUTS.ROTATE_CCW, INPUTS.ROTATE_CW];
        playInputs.forEach(inputType => {
            this.playerInput.on(inputType, () => this.enqueuePlayInput(inputType));
        });
    }
    enqueuePlayInput(inputType) {
        if(!this.modeMachine.current === MODES.PLAYING) return;
        this.playInputQueue = this.playInputQueue.concat(inputType);
    }

    attachModeEvents() {
        this.modeMachine.onenterstate = (event, lastMode, newMode) => {
            console.log('mode transition:', event, lastMode, newMode);
            this.playerInput.setMode(newMode); // switch key binding mode
        };
        this.modeMachine.onplay = (event, lastMode, newMode) => {
            console.log('onplay', event, lastMode, newMode);
        };
        this.modeMachine.onreset = () => {
            this.playfield = new Playfield({
                width: this.width, height: this.height,
                onWin: this.onGameWin.bind(this),
                onLose: this.onGameLose.bind(this)
            })
        }
    }

    onGameWin() {
        this.modeMachine.win();
    }
    onGameLose() {
        this.modeMachine.lose();
    }

    getState() {
        // minimal description of game state to render
        return {
            mode: this.modeMachine.current,
            grid: this.playfield.grid.toJS()
        };
    }

    run({fps = 60, slow = 1}) {
        const step = 1 / fps,
            slowStep = slow * step;

        _.assign(this, {
            dt: 0,
            last: timestamp(),
            fps, slow, step, slowStep
        });

        requestAnimationFrame(this.tick.bind(this));
    }

    tick() {
        const now = timestamp();
        const {dt, last, slow, slowStep} = this;

        this.dt = dt + Math.min(1, (now - last) / 1000);
        while(this.dt > slowStep) {
            this.dt = this.dt - slowStep;
            //update(this.step);
            if(this.modeMachine.current == MODES.PLAYING) {
                this.playfield.tick(this.playInputQueue);
                this.playInputQueue = [];
            }
        }

        this.render(this.getState(), this.dt/slow);
        this.last = now;
        requestAnimationFrame(this.tick.bind(this));
    }
}

function timestamp() {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function generatePillSequence(colors, count=128) {
    return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
}