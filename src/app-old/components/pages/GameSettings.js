import React from 'react';
import {Link} from 'react-router';
import Slider from 'react-slider';

export default class GameSettings extends React.Component {
  state = {
    level: 0,
    speed: 15,
    speedLevels: [],
    name: window.localStorage ?
      (window.localStorage.getItem('mrdario-name') || '') : ''
  };

  onChangeName = (e) => {
    const name = e.target.value;
    this.setState({name});
    if(window.localStorage) {
      window.localStorage.setItem('mrdario-name', name);
    }
  };
  onChangeLevel = (level) => {
    this.setState({level});
  };
  onChangeSpeed = (speed) => {
    this.setState({speed});
  };

  render() {
    return <div className="page-settings">

      <div className="settings-head">
        <h2>Mr. Dario</h2>
      </div>

      <div className="settings-content">
        <div>
          <h3>Name (for high scores)</h3>
          <div>
            <input type="text" value={this.state.name} onChange={this.onChangeName} placeholder="Anonymous"/>
          </div>

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
            <span className="key-controls-group">
              <span className="key-rect">
                <span className="key-title">←</span>
              </span>
              <span className="key-rect">
                <span className="key-title">↓</span>
              </span>
              <span className="key-rect">
                <span className="key-title">→</span>
              </span>
            </span>
            <span className="key-controls-group">
              <span className="key-rect">
                <span className="key-title title-large">↻</span>
                <span className="key-title title-small">A</span>
              </span>
              <span className="key-rect">
                <span className="key-title title-large">↺</span>
                <span className="key-title title-small">S</span>
              </span>
            </span>
          </div>
          
        </div>
      </div>

      <div className="settings-play">
        <Link to={`/game/level/${this.state.level}/speed/${this.state.speed}`}>
          <span className="btn-white">
              Play
          </span>
        </Link>
      </div>
    </div>
  }
}
