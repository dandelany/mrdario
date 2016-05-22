import React from 'react';
import {Link} from 'react-router';

import MayaNumeral from 'app/components/lib/MayaNumeral';

const WonOverlay = (props) => {
  const {style, params} = props;
  const level = parseInt(params.level || 0);
  const speed = parseInt(params.speed || 0);
  const nextLevelPath = `/game/level/${level + 1}/speed/${speed}`;

  return <div className="game-overlay" style={style}>
    <div className="win-lose-symbol win-symbol">
      <MayaNumeral value={level} size={40}/>
      <h2>WIN</h2>
    </div>

    <div>
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
