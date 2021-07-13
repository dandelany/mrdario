import * as React from "react";
import { Link } from "react-router-dom";

import MayaNumeral from "@/components/ui/MayaNumeral";
import { GameOptions } from "mrdario-core";

interface LostOverlayProps {
  style?: object;
  gameOptions?: Partial<GameOptions>;
  onResetGame?: () => void;
}

const LostOverlay: React.FunctionComponent<LostOverlayProps> = props => {
  const { style } = props;
  const gameOptions = props.gameOptions || {};
  const level = gameOptions.level || 0;
  // const speed = gameOptions.baseSpeed || 0;
  // const thisLevelPath = `/game/level/${level}/speed/${speed}`;

  return (
    <div className="game-overlay" style={style}>
      <div className="win-lose-symbol lose-symbol">
        <MayaNumeral value={level} size={40} />
        <h2>GAME OVER</h2>
      </div>

      <div>
        <span className="btn-white" onClick={props.onResetGame}>
          <div className="btn-maya-numeral" style={{ marginBottom: 10 }}>
            <MayaNumeral value={level} size={20} />
          </div>
          Try Again
        </span>
      </div>
      <div>
        <Link to="/">
          <span className="btn-white">Back to Menu</span>
        </Link>
      </div>
    </div>
  );
};

export default LostOverlay;
