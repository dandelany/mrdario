import _ from 'lodash';
import React from 'react/addons';
import StateMachine from 'javascript-state-machine';

import Playfield from './Playfield';
import PlayerControls from './PlayerControls';

import {
    PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
    MODES, INPUTS, GRID_OBJECTS, COLORS, KEY_BINDINGS
} from '../constants';

const defaultKeys = {
    [MODES.TITLE]: { [INPUTS.PLAY]: 'enter, space, escape' },
    [MODES.PLAYING]: {
        [INPUTS.LEFT]: 'left',
        [INPUTS.RIGHT]: 'right',
        [INPUTS.UP]: 'up',
        [INPUTS.DOWN]: 'down',
        [INPUTS.ROTATE_LEFT]: 'a',
        [INPUTS.ROTATE_RIGHT]: 's',
        [INPUTS.PAUSE]: 'escape'
    },
    [MODES.PAUSED]: { [INPUTS.RESUME]: 'enter, space, escape' },
    [MODES.WON]: { [INPUTS.RESET]: 'enter, space, escape' },
    [MODES.LOST]: { [INPUTS.RESET]: 'enter, space, escape' }
};


export default class MrDario {
    constructor({render=_.noop, keyBindings = defaultKeys, width = PLAYFIELD_WIDTH, height = PLAYFIELD_HEIGHT}) {
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
            playfield: new Playfield({}),
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

        const playInputs = [INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN, INPUTS.ROTATE_LEFT, INPUTS.ROTATE_RIGHT];
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
    }

    getState() {
        // minimal description of game state to render
        return {
            mode: this.modeMachine.current,
            grid: this.playfield.grid
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