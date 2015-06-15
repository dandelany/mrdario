import _ from 'lodash';
import React from 'react';
import { Link } from 'react-router';
import RadioGroup from 'react-radio-group';
import Slider from 'react-slider';

const GameSettings = React.createClass({
    propTypes: {
        speedLevels: React.PropTypes.object
    },
    getDefaultProps() {
        return {
            speedLevels: {Slow: 10, Medium: 20, Fast: 30}
        }
    },
    getInitialState() {
        return {
            level: 0,
            speed: null,
            speedLevels: []
        }
    },

    onChangeLevel(level) {
        this.setState({level});
    },

    render() {
        return <div>
            <h2>Mr. Dario</h2>

            <h3>Level {this.state.level}</h3>
            <div>
                <Slider
                    value={this.state.level}
                    onChange={this.onChangeLevel}
                    min={0} max={20}
                    className='horizontal-slider'
                />
            </div>

            <h3>Speed</h3>
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

            <h4>Keyboard controls:</h4>
            <div>
                <p>Arrow keys to move</p>
                <p><strong>A</strong> and <strong>S</strong> to rotate</p>
            </div>

            <div>
                <Link to="single" params={{level: this.state.level, speed: 10}}>Play</Link>
            </div>
        </div>
    }
});

export default GameSettings;