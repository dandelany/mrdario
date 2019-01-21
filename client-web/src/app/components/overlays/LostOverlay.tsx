import * as React from 'react';
import {Link} from 'react-router-dom';

import MayaNumeral from '../lib/MayaNumeral';

interface LostOverlayProps {
  style?: object;
  params: {
    level: number,
    speed: number
  }
}

const LostOverlay: React.FunctionComponent<LostOverlayProps> = (props) => {
  const {style, params} = props;
  const {level, speed} = params;
  const thisLevelPath = `/game/level/${level}/speed/${speed}`;

  return <div className="game-overlay" style={style}>
    <div className="win-lose-symbol lose-symbol">
      <MayaNumeral value={level} size={40}/>
      <h2>GAME OVER</h2>
    </div>

    <div>
      <Link to={thisLevelPath}>
        <span className="btn-white">
          <div className="btn-maya-numeral" style={{marginBottom: 10}}>
            <MayaNumeral value={level} size={20}/>
          </div>
          Try Again
        </span>
      </Link>
    </div>
    <div>
      <Link to="/">
        <span className="btn-white">Back to Menu</span>
      </Link>
    </div>
  </div>
};

export default LostOverlay;
