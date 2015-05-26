const _ = require('lodash');
const React = require('react/addons');
const StateMachine = require('javascript-state-machine');

const PlayerControls = require('./PlayerControls');
const Playfield = require('./Playfield');

const {
    PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
    MODES, INPUTS, GRID_OBJECTS, COLORS, KEY_BINDINGS
    } = require('../constants');

//const initialMode = MODES.LOADING;
//const modeTransitions = [
//    {name: 'loaded', from: MODES.LOADING, to: MODES.TITLE},
//    {name: 'play',   from: MODES.TITLE,   to: MODES.PLAYING},
//    {name: 'pause',  from: MODES.PLAYING, to: MODES.PAUSED},
//    {name: 'resume', from: MODES.PAUSED,  to: MODES.PLAYING},
//    {name: 'win',    from: MODES.PLAYING, to: MODES.WON},
//    {name: 'lose',   from: MODES.PLAYING, to: MODES.LOST},
//    {name: 'reset',  from: ['*'], to: MODES.TITLE}
//];

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
    constructor({render, keyBindings=defaultKeys, width=PLAYFIELD_WIDTH, height=PLAYFIELD_HEIGHT }) {
        _.assign(this, {
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
            playfield: new Playfield({}),
            playerInput: new PlayerControls(keyBindings),
            playInputQueue: [],
            render, width, height
        });
        //this.modeMachine = StateMachine.create({initial: initialMode, events: modeTransitions});
        // make an empty grid
        //this.grid = _.times(width, _.times(height, () => {
        //        return {type: GRID_OBJECTS.EMPTY}}
        //));
        //this.playfield = new Playfield({});
        //this.render = render;

        this.attachModeEvents();
        this.attachInputEvents();
        this.modeMachine.loaded();
        this.run({});

    }

    attachInputEvents() {
        this.playerInput.on(INPUTS.PLAY, ()=> this.modeMachine.play());
        this.playerInput.on(INPUTS.PAUSE, ()=> this.modeMachine.pause());
        this.playerInput.on(INPUTS.RESUME, ()=> this.modeMachine.resume());
        this.playerInput.on(INPUTS.RESET, ()=> this.modeMachine.reset());

        [INPUTS.LEFT, INPUTS.RIGHT].forEach(inputType => {
            this.playerInput.on(inputType, ()=> this.enqueuePlayInput(inputType));
        });
        //this.playerInput.on(INPUTS.LEFT, ()=> this.enqueueInput.bind(INPUTS.LEFT));
        //this.playerInput.on(INPUTS.RIGHT, ()=> this.enqueueInput.bind(INPUTS.LEFT));

    }
    attachModeEvents() {
        var fsm = this.modeMachine;
        //fsm.on
        fsm.onenterstate = function(event, lastMode, newMode) {
            console.log('mode transition:', event, lastMode, newMode);
            this.playerInput.setMode(newMode); // switch key binding mode
        }.bind(this);
    }

    enqueuePlayInput(inputType) {
        if(!this.modeMachine.current === MODES.PLAYING) return;
        this.playInputQueue = this.playInputQueue.concat(inputType);
    }

    getState() {
        // returns the minimal description of game state
        // to pass to renderer
        return {
            mode: this.modeMachine.current,
            grid: this.playfield.grid
        };
    }

    run(options) {
        //var now,
        //    dt = 0,
        //    last = utils.timestamp(),
        //    slow = options.slow || 1, // slow motion scaling factor
        //    fps = options.fps || 60,
        //    step = 1 / fps,
        //    slowStep = slow * step;
        //update = options.update,
        //render = options.render;

        const fps = options.fps || 60,
            step = 1 / fps,
            slow = options.slow || 1, // slow motion scaling factor
            slowStep = slow * step;

        _.assign(this, {
            dt: 0,
            last: timestamp(),
            fps, step, slow, slowStep
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