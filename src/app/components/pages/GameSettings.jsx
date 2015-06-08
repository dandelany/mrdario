import React from 'react';
import { Link } from 'react-router';

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
            <div>
                Play
            </div>
        </div>
    }
});

export default GameSettings;