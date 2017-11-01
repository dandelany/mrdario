import React from 'react';
import {Link} from 'react-router-dom';

export default class TitlePage extends React.Component {
  render() {
    return <div className="page-title">
      <div className="title-head">
        <h1>Mr. Dario</h1>
      </div>

      <div className="title-game-options">
        <div className="title-game-option">
          <Link to="settings">
            <span className="btn-white">
                Single Player
            </span>
          </Link>
        </div>

        <div className="title-game-option">
          <Link to="highscores">
            <span className="btn-white">
                High Scores
            </span>
          </Link>
        </div>

        <div className="title-game-option">
          <span className="btn-white disabled">
              Multiplayer soon
          </span>
        </div>
      </div>
    </div>;
  }
}
