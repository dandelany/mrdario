import * as React from "react";
import * as _ from "lodash";
import { debounce } from "lodash";
import { Link } from "react-router-dom";
import Slider from "rc-slider";
import { SCClientSocket } from "socketcluster-client";

type HighScoresRow = [string, number];

interface HighScoresResponse {
  level: number;
  scores: HighScoresRow[];
}

interface HighScoresState {
  level: number;
  scoresForLevel: Map<string, HighScoresRow>;
}

interface HighScoresProps {
  socket: SCClientSocket;
}

export default class HighScores extends React.Component<HighScoresProps, HighScoresState> {
  state: HighScoresState = {
    level: 0,
    scoresForLevel: new Map<string, HighScoresRow>()
  };

  private _debouncedGetScoresForLevel(_level: number) {}

  constructor(props: HighScoresProps) {
    super(props);
    this._debouncedGetScoresForLevel = debounce(this._getScoresForLevel, 300);
  }
  componentWillMount() {
    this._getScoresForLevel(this.state.level);
  }

  _getScoresForLevel(level: number) {
    const { socket } = this.props;
    socket.emit("getSingleHighScores", level, (_err, data) => {
      const { level, scores } = data as HighScoresResponse;
      this.setState({
        scoresForLevel: {
          ...this.state.scoresForLevel,
          ...{ [level + ""]: scores }
        }
      });
    });
  }

  _onChangeLevel = (level: number) => {
    this.setState({ level });
    if (!_.has(this.state.scoresForLevel, level + "")) {
      this._debouncedGetScoresForLevel(level);
    }
  };

  render() {
    const { level, scoresForLevel } = this.state;

    return (
      <div>
        <div className="high-scores">
          <h3>Single Player</h3>

          <h2>Level {level}</h2>

          <Slider
            min={0}
            max={20}
            value={this.state.level}
            onChange={this._onChangeLevel}
            // width={"40vh"}
          />

          <h3>High Scores</h3>

          {_.has(scoresForLevel, level + "") ? (
            scoresForLevel[level + ""].length ? (
              <div>
                <table>
                  <tbody>
                    {scoresForLevel[level + ""].map((row: HighScoresRow, i: number) => {
                      return (
                        <tr key={`score-${i}`}>
                          <td>
                            <strong>#{i + 1}</strong>
                          </td>
                          <td>
                            <div className="score-name">{row[0]}</div>
                          </td>
                          <td>{row[1]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              `No scores for level ${level}!`
            )
          ) : (
            "Loading..."
          )}
        </div>

        <div>
          <Link to="/">
            <span className="btn-white">Back to Menu</span>
          </Link>
        </div>
      </div>
    );
  }
}
