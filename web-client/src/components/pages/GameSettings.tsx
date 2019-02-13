import * as React from "react";
import { Link } from "react-router-dom";
import Slider from "rc-slider";

export interface GameSettingsState {
  level: number;
  speed: number;
  speedLevels: any[]; // todo
  name: string;
}

export interface GameSettingsProps {}

export default class GameSettings extends React.Component<GameSettingsProps, GameSettingsState> {
  state = {
    level: 0,
    speed: 15,
    speedLevels: [],
    name: window.localStorage ? window.localStorage.getItem("mrdario-name") || "" : ""
  };

  onChangeName = (e: React.FormEvent<HTMLInputElement>) => {
    const name = e.currentTarget.value;
    this.setState({ name });
    if (window.localStorage) {
      window.localStorage.setItem("mrdario-name", name);
    }
  }
  onChangeLevel = (level: number) => {
    this.setState({ level });
  }
  onChangeSpeed = (speed: number) => {
    this.setState({ speed });
  }

  render() {
    return (
      <div className="page-settings">
        <div className="settings-head">
          <h2>Mr. Dario</h2>
        </div>

        <div className="settings-content">
          <div>
            <h3>
              Name:
              <input
                type="text"
                value={this.state.name}
                onChange={this.onChangeName}
                placeholder="Anonymous"
              />
            </h3>
            <div />

            <h3>Level {this.state.level}</h3>
            <div>
              <Slider value={this.state.level} onChange={this.onChangeLevel} min={0} max={20} />
            </div>

            <h3>Speed {this.state.speed}</h3>
            <div>
              <Slider value={this.state.speed} onChange={this.onChangeSpeed} min={10} max={30} />
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
            <span className="btn-white">Play</span>
          </Link>
        </div>
      </div>
    );
  }
}
