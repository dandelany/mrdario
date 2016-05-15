import React from 'react';
import {Link} from 'react-router';

export default class TitlePage extends React.Component {
  render() {
    return <div className="page-title">
      <div className="title-head">
        <h1>Mr. Dario</h1>
      </div>

      <div className="title-game-options">
        <div className="title-game-option">
          <Link to="settings">
            <span>
                One Player
            </span>
          </Link>
        </div>

        <div className="title-game-option disabled">
          <span>
              Multiplayer soon
          </span>
        </div>
      </div>
    </div>;
  }
}
