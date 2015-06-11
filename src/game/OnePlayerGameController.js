import _ from 'lodash';
import React from 'react/addons';
import StateMachine from 'javascript-state-machine';

import Game from './Game';
import PlayerControls from './PlayerControls';

import {
    PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
    MODES, INPUTS, GRID_OBJECTS, COLORS, DEFAULT_KEYS
} from '../constants';

import Immutable from 'immutable';
window.Immutable = Immutable;

// a game controller class for the basic 1-player game, played entirely on the client (in browser)
// controls the frame timing and must tick the Game object once per frame
// controls the high-level game state and must call render() when game state changes

export default class OnePlayerGameController {
    constructor({render = _.noop, keyBindings = DEFAULT_KEYS, width = PLAYFIELD_WIDTH, height = PLAYFIELD_HEIGHT}) {
        _.assign(this, {
            // width and height of the playfield grid, in grid units
            width, height,
            // render function which is called when game state changes
            // this is the only connection between game logic and presentation
            render,
            // a finite state machine representing game mode, & transitions between modes
            modeMachine: StateMachine.create({
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
            playerInput: new PlayerControls(keyBindings),
            playInputQueue: []
        });

        this.initGame();
        this.attachModeEvents();
        this.attachInputEvents();
        this.modeMachine.loaded();
    }
    initGame() {
        const {width, height} = this;
        this.game = new Game({
            width, height,
            onWin: () => this.modeMachine.win(),
            onLose: () => this.modeMachine.lose()
        });
    }

    attachModeEvents() {
        this.modeMachine.onenterstate = (event, lastMode, newMode) => {
            this.render(this.getState()); // re-render on any mode change
            this.playerInput.setMode(newMode); // switch key binding mode
        };
        this.modeMachine.onplay = () => this.run();
        this.modeMachine.onreset = () => this.initGame();
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
        if (this.modeMachine.current !== MODES.PLAYING) return;
        this.playInputQueue.push(inputType);
    }

    run({fps = 60, slow = 1} = {}) {
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
        if(this.modeMachine.current !== MODES.PLAYING) return;
        const now = timestamp();
        const {dt, last, slow, slowStep} = this;

        this.dt = dt + Math.min(1, (now - last) / 1000);
        while(this.dt > slowStep) {
            this.dt = this.dt - slowStep;
            this.game.tick(this.playInputQueue);
            this.playInputQueue = [];
        }

        this.render(this.getState(), this.dt/slow);
        this.last = now;
        requestAnimationFrame(this.tick.bind(this));
    }

    getState() {
        // minimal description of game state to render
        return {
            mode: this.modeMachine.current,
            grid: this.game.playfield.toJS()
        };
    }
}

function timestamp() {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function generatePillSequence(colors, count=128) {
    return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
}