import _ from 'lodash';
import React from 'react';
import { Link } from 'react-router';
import RadioGroup from 'react-radio-group';

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

            <h4>Keyboard controls:</h4>
            <div>
                <p>Arrow keys to move</p>
                <p><strong>A</strong> and <strong>S</strong> to rotate</p>
            </div>

            <div>
                <Link to="single" params={{level: 3, speed: 10}}>Play</Link>
            </div>
        </div>
    }
});

export default GameSettings;