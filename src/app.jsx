const React = require('react/addons');
const StateMachine = require('javascript-state-machine');
const utils = require('./utils');
const PlayerControls = require('./PlayerControls');
const {
    PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
    MODES, INPUTS, GRID_OBJECTS, COLORS, KEY_BINDINGS
} = require('./constants');

const initialMode = MODES.LOADING;
const modeTransitions = [
    {name: 'loaded', from: MODES.LOADING, to: MODES.TITLE},
    {name: 'play',   from: MODES.TITLE,   to: MODES.PLAYING},
    {name: 'pause',  from: MODES.PLAYING, to: MODES.PAUSED},
    {name: 'resume', from: MODES.PAUSED,  to: MODES.PLAYING},
    {name: 'win',    from: MODES.PLAYING, to: MODES.WON},
    {name: 'lose',   from: MODES.PLAYING, to: MODES.LOST},
    {name: 'reset',  from: ['*'], to: MODES.TITLE}
];

const keyBindings = {
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

function update(step) { console.log('step ' + step); }
function render(dt) { console.log('render ' + dt); }

class Game {
    constructor({render}) {
        this.playerInput = new PlayerControls(keyBindings);
        this.modeMachine = StateMachine.create({initial: initialMode, events: modeTransitions});
        // make an empty grid
        this.playfield = _.times(PLAYFIELD_WIDTH, _.times(PLAYFIELD_HEIGHT, () => GRID_OBJECTS.EMPTY));

        this.attachModeEvents();
        this.attachInputEvents();
        this.modeMachine.loaded();
        //this.run();
    }

    attachInputEvents() {
        this.playerInput.on(INPUTS.PLAY, () => this.modeMachine.play());
        this.playerInput.on(INPUTS.PAUSE, () => this.modeMachine.pause());
        this.playerInput.on(INPUTS.RESUME, () => this.modeMachine.resume());
        this.playerInput.on(INPUTS.RESET, () => this.modeMachine.reset());
        this.playerInput.on(INPUTS.DOWN, () => this.modeMachine.win());
    }
    attachModeEvents() {
        var fsm = this.modeMachine;
        //fsm.on
        fsm.onenterstate = function(event, lastMode, newMode) {
            console.log('mode transition:', event, lastMode, newMode);
            this.playerInput.setMode(newMode);
        }.bind(this)
    }

    getState() {
        // returns the minimal description of game state
        // to pass to renderer
        return {
            mode: this.modeMachine.current,
            playfield: this.playfield
        };
    }

    run(options) {
        var now,
            dt = 0,
            last = utils.timestamp(),
            slow = options.slow || 1, // slow motion scaling factor
            fps = options.fps || 60,
            step = 1 / fps,
            slowStep = slow * step;
            //update = options.update,
            //render = options.render;

        function frame() {
            now = utils.timestamp();
            dt = dt + Math.min(1, (now - last) / 1000);
            while(dt > slowStep) {
                dt = dt - slowStep;
                update(step);
            }
            render(dt/slow);
            last = now;

            //requestAnimationFrame(frame, options.canvas);
            requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    }

}

window.Game = Game;

const MrDario = React.createClass({
    onKeyPress() { console.log('help') },
    render() {
        return <div>
            <h2>Mr Dario</h2>

            <div className="playfield" onKeyPress={this.onKeyPress}>
                {_.range(PLAYFIELD_WIDTH).map(rowIndex => {
                    return <div className="playfield-row">
                        {_.range(PLAYFIELD_HEIGHT).map(colIndex => {
                            return <div className="playfield-cell">..</div>
                        })}
                    </div>
                })}
            </div>

        </div>
    }
});

module.exports = MrDario;