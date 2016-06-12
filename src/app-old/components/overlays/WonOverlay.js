import React from 'react';
import {Link} from 'react-router';

import MayaNumeral from 'app/components/lib/MayaNumeral';

const Scores = (props) => {
  const {gameState, highScores} = props;
  // const gameState = {timeBonus: 1000, score: 2000};
  // const highScores = [["dan", 100], ["dan", 100], ["dan", 100], ["dan", 100], ["dan", 100], ["dan", 100]];

  return gameState ?
    <div className="won-overlay-score">
      <div>
        <strong>Time Bonus: </strong>
        {gameState.timeBonus || 0}
      </div>
      <div>
        <strong>Score: </strong>
        {gameState.score}
      </div>

      {highScores ?
        <div className="won-overlay-high-scores">
          <hr/>
          High Scores
          {highScores.map(([name, score]) => (
            <div><strong>{name}</strong> — {score}</div>
          ))}
        </div>
        : null
      }
    </div>
    : null;
};

const WonOverlay = (props) => {
  const {style, params, gameState, highScores} = props;
  const level = parseInt(params.level || 0);
  const speed = parseInt(params.speed || 0);
  const nextLevelPath = `/game/level/${level + 1}/speed/${speed}`;

  return <div className="game-overlay" style={style}>
    <div className="win-lose-symbol win-symbol">
      <MayaNumeral value={level} size={25}/>
      <h2>WIN</h2>
    </div>

    <div>
      <Scores {...{gameState, highScores}} />

      <Link to={nextLevelPath}>
        <span className="btn-white">
          <div className="btn-maya-numeral" style={{marginBottom: 10}}>
            <MayaNumeral value={level + 1} size={20}/>
          </div>
          Next Level &raquo;
        </span>
      </Link>
    </div>
    <div>
      <Link to="/">
        <span className="btn-white">Back to Menu</span>
      </Link>
    </div>
  </div>;
};

export default WonOverlay;
