import React from 'react';
import _ from 'lodash';
import {Link} from 'react-router';
import Slider from 'rc-slider';

export default class HighScores extends React.Component {
  state = {
    level: 0,
    scoresForLevel: {}
  };

  constructor() {
    super();
    this._debouncedGetScoresForLevel = _.debounce(this._getScoresForLevel, 300);
  }
  componentWillMount() {
    this._getScoresForLevel(this.state.level);
  }

  _getScoresForLevel(level) {
    const {socket} = this.props;
    socket.emit('getSingleHighScores', level, (err, data) => {
      const {level, scores} = data;
      this.setState({scoresForLevel: {...this.state.scoresForLevel, ...{[level+'']: scores}}});
    });
  }

  _onChangeLevel = (level) => {
    this.setState({level});
    if(!_.has(this.state.scoresForLevel, level + '')) {
      this._debouncedGetScoresForLevel(level);
    }
  };

  render() {
    const {level, scoresForLevel} = this.state;

    return <div>
      <div className="high-scores">
        <h3>Single Player</h3>

        <h2>Level {level}</h2>

        <Slider
          min={0}
          max={20}
          width="40vh"
          value={this.state.level}
          onChange={this._onChangeLevel}
        />

        <h3>High Scores</h3>

        {
          (_.has(scoresForLevel, level + '')) ?
            (scoresForLevel[level+''].length) ?

              <div>
                <table>
                  <tbody>
                  {scoresForLevel[level+''].map((row, i) => {
                    return <tr key={`score-${i}`}>
                      <td><strong>#{i + 1}</strong></td>
                      <td>
                        <div className="score-name">{row[0]}</div>
                      </td>
                      <td>{row[1]}</td>
                    </tr>;
                  })}
                  </tbody>
                </table>
              </div>

              : `No scores for level ${level}!`

            : "Loading..."
        }
      </div>

      <div>
        <Link to="/">
          <span className="btn-white">Back to Menu</span>
        </Link>
      </div>
    </div>

  }
}
