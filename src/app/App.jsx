import { MODES, SPEED_LEVELS } from '../constants';
import React from 'react';
import RadioGroup from 'react-radio-group';
import cx from 'classnames';

import Playfield from './components/Playfield.jsx';

const GameSettings = React.createClass({
    propTypes: {
        speedLevels: React.PropTypes.object
    },
    getInitialState() {
        return {
            level: 0,
            speed: null
        }
    },
    render() {
        return <div>
            <div>
                Virus level
                <input type="text" value={this.state.level}/>
            </div>
            <div>
                <RadioGroup name="speed" value={this.state.speed}>
                    {_.map(this.props.speedLevels, speed => {
                        return <label for={speed}>
                            <input type="radio" value={speed} />
                            {speed}
                        </label>
                    })}
                </RadioGroup>
            </div>
        </div>
    }
});

const MrDario = React.createClass({
    render() {
        let contents = this.props.mode;
        switch(this.props.mode) {
            case MODES.LOADING:
                contents = <div className="game-loading">Loading...</div>;
                break;
            case MODES.TITLE:
                contents = <div className="game-title">
                    <h3>Welcome to Mr. Dario!</h3>
                    <h4>Keyboard controls:</h4>
                    <div>
                        <p>Arrow keys to move</p>
                        <p><strong>A</strong> and <strong>S</strong> to rotate</p>
                    </div>
                    <h4>Press spacebar to play</h4>
                </div>;
                break;
            case MODES.PLAYING:
            case MODES.WON:
            case MODES.LOST:
                contents = <Playfield grid={this.props.grid}></Playfield>
                break;
        }

        if(this.props.mode === MODES.WON || this.props.mode === MODES.LOST) {
            contents = <div>
                <h2>You {this.props.mode}!</h2>
                <h3>Press spacebar to reset</h3>
                {contents}
            </div>;
        }

        return <div>
            <h2>Mr Dario</h2>
            <div className="game-container">
                {contents}
            </div>
        </div>
    }
});



export default class App {
    constructor(el) {
        this.el = el;
        this.game = null;
    }

    onStartGame() {

    }

    render(gameState, dt) {
        const {mode, grid} = gameState;
        React.render(<MrDario {...gameState} />, this.el);
    }
}