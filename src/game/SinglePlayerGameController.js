import _ from 'lodash';
import React from 'react';
import StateMachine from 'javascript-state-machine';

import Game from 'game/Game';
import PlayerControls from 'game/PlayerControls';

import {
    PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
    MODES, INPUTS, GRID_OBJECTS, COLORS, DEFAULT_KEYS
} from 'constants';

import Immutable from 'immutable';
window.Immutable = Immutable;

// a game controller class for the basic 1-player game, played entirely on the client (in browser)
// controls the frame timing and must tick the Game object once per frame
// controls the high-level game state and must call render() when game state changes

export default class SinglePlayerGameController {
    constructor({
        render = _.noop, fps = 60, slow = 1,
        level = 0, speed = 15,
        keyBindings = DEFAULT_KEYS,
        width = PLAYFIELD_WIDTH, height = PLAYFIELD_HEIGHT
    } = {}) {
        _.assign(this, {
            // width and height of the playfield grid, in grid units
            width, height,
            // render function which is called when game state changes
            // this is the only connection between game logic and presentation
            render,
            // frames (this.tick/render calls) per second
            fps,
            step: 1 / fps,
            // slow motion factor, to simulate faster/slower gameplay for debugging
            slowStep: slow * (1 / fps),

            level, speed,

            // the player controls which feed key events into the Game
            playerInput: new PlayerControls(keyBindings),
            moveInputQueue: [],

            // a finite state machine representing game mode, & transitions between modes
            modeMachine: StateMachine.create({
                initial: MODES.READY,
                events: [
                    {name: 'play',   from: MODES.READY,   to: MODES.PLAYING},
                    {name: 'pause',  from: MODES.PLAYING, to: MODES.PAUSED},
                    {name: 'resume', from: MODES.PAUSED,  to: MODES.PLAYING},
                    {name: 'win',    from: MODES.PLAYING, to: MODES.WON},
                    {name: 'lose',   from: MODES.PLAYING, to: MODES.LOST},
                    {name: 'reset',  from: ['*'], to: MODES.READY},
                    {name: 'end',    from: ['*'], to: MODES.ENDED}
                ]
            })
        });

        this.initGame();
        this.attachModeEvents();
        this.attachInputEvents();
        this.render(this.getState());
    }
    initGame() {
        const {width, height, level, speed} = this;
        this.game = new Game({
            width, height,
            level,
            baseSpeed: speed,
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

        const moveInputs = [INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN, INPUTS.ROTATE_CCW, INPUTS.ROTATE_CW];
        moveInputs.forEach(input => this.playerInput.on(input, this.enqueueMoveInput.bind(this, input)));

        this.playerInput.setMode(MODES.READY);
    }
    enqueueMoveInput(input, eventType, event) {
        // queue a user move, to be sent to the game on the next tick
        if (this.modeMachine.current !== MODES.PLAYING) return;
        this.moveInputQueue.push({input, eventType});
        event.preventDefault();
    }

    play() {
        this.modeMachine.play();
    }

    run() {
        // called when gameplay starts, to initialize the game loop
        _.assign(this, {dt: 0, last: timestamp()});
        requestAnimationFrame(this.tick.bind(this));
    }

    tick() {
        // called once per frame
        if(this.modeMachine.current !== MODES.PLAYING) return;
        const now = timestamp();
        const {dt, last, slow, slowStep} = this;

        // allows the number of ticks to stay consistent
        // even if FPS changes or lags due to performance
        this.dt = dt + Math.min(1, (now - last) / 1000);
        while(this.dt > slowStep) {
            this.dt = this.dt - slowStep;
            this.tickGame();
        }

        // render with the current game state
        this.render(this.getState(), this.dt/slow);
        this.last = now;
        requestAnimationFrame(this.tick.bind(this));
    }
    tickGame() {
        // tick the game, sending current queue of moves
        this.game.tick(this.moveInputQueue);
        this.moveInputQueue = [];
    }

    getState() {
        // minimal description of game state to render
        return {
            mode: this.modeMachine.current,
            grid: this.game.playfield.toJS()
        };
    }

    cleanup() {
        // cleanup the game when we're done
        this.modeMachine.end();
        this.playerInput.removeAllListeners();
    }
}

function timestamp() {
    return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function generatePillSequence(colors, count=128) {
    return _.times(count, () => [{color: _.sample(colors)}, {color: _.sample(colors)}]);
}