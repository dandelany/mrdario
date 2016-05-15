import _ from 'lodash';
import React from 'react';
import { Link } from 'react-router';
import Slider from 'react-slider';

const GameSettings = React.createClass({
    getInitialState() {
        return {
            level: 0,
            speed: 15,
            speedLevels: []
        }
    },

    onChangeLevel(level) {
        this.setState({level});
    },
    onChangeSpeed(speed) {
        this.setState({speed});
    },

    render() {
        return <div className="page-settings">

            <div className="settings-head">
                <h2>Mr. Dario</h2>
            </div>

            <div className="settings-content">
                <div>
                    <h3>Level {this.state.level}</h3>
                    <div>
                        <Slider
                            value={this.state.level}
                            onChange={this.onChangeLevel}
                            min={0} max={20}
                            className='horizontal-slider'
                            />
                    </div>

                    <h3>Speed {this.state.speed}</h3>
                    <div>
                        <Slider
                            value={this.state.speed}
                            onChange={this.onChangeSpeed}
                            min={10} max={30}
                            className='horizontal-slider'
                            />
                    </div>

                    <h4>Keyboard controls:</h4>
                    <div>
                        <p>Arrow keys to move</p>
                        <p><strong>A</strong> and <strong>S</strong> to rotate</p>
                    </div>
                </div>
            </div>

            <div className="settings-play">
                
                <Link to={`/game/level/${this.state.level}/speed/${this.state.speed}`}>
                    <span>
                        Play
                    </span>
                </Link>
            </div>
        </div>
    }
});

export default GameSettings;