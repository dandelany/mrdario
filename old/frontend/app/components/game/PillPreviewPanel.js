import React from 'react';

import {GRID_OBJECTS} from 'game/constants';
import PillPart from 'app/components/game/PillPart';


export default class PillPreviewPanel extends React.Component {
  render() {
    const {pill, cellSize} = this.props;

    const name = window.localStorage ?
      (window.localStorage.getItem('mrdario-name') || 'Anonymous') : 'Anonymous';

    return <div
      className="pill-preview-panel"
      style={{padding: cellSize / 2}}
    >
      <h5>NEXT</h5>

      <svg width={cellSize * 2} height={cellSize}>
        <PillPart {...{
          type: GRID_OBJECTS.PillLeft,
          color: pill[0].color,
          cellSize,
          svgProps: {width: cellSize, height: cellSize}
        }}/>
        <PillPart {...{
          type: GRID_OBJECTS.PillRight,
          color: pill[1].color,
          cellSize,
          gProps: {transform: `translate(${cellSize},0)`},
          svgProps: {width: cellSize, height: cellSize}
        }}/>
      </svg>

      {
        name === "BEA" ?
          <div>
            <h5>Hi baby</h5>
            <h5>❤️</h5>
          </div>
          : null
      }
    </div>
  }
}
