import * as React from "react";

import { GridObjectType, PillColors } from "mrdario-core/src/game/types";
import PillPart from "./PillPart";

export interface PillPreviewPanelProps {
  cellSize: number;
  pill: PillColors;
  className: string;
  style: React.CSSProperties;
}

export default class PillPreviewPanel extends React.Component<PillPreviewPanelProps> {
  static defaultProps = {
    className: "pill-preview-panel",
    style: {}
  };
  render() {
    const { pill, cellSize, className} = this.props;

    const name = window.localStorage
      ? window.localStorage.getItem("mrdario-name") || "Anonymous"
      : "Anonymous";

    const style = {
      padding: cellSize / 2,
      borderRadius: cellSize * 0.5,
      ...this.props.style
    };
    return (

      <div className={className} style={style}>
        <h5>NEXT</h5>

        <svg width={cellSize * 2} height={cellSize}>
          <PillPart
            type={GridObjectType.PillLeft}
            color={pill[0]}
            cellSize={cellSize}
            svgProps={{ width: cellSize, height: cellSize }}
          />
          <PillPart
            type={GridObjectType.PillRight}
            color={pill[1]}
            cellSize={cellSize}
            gProps={{ transform: `translate(${cellSize},0)` }}
            svgProps={{ width: cellSize, height: cellSize }}
          />
        </svg>

        {name === "BEA" ? (
          <div>
            <h5>Hi baby</h5>
            <h5>❤️</h5>
          </div>
        ) : null}
      </div>
    );
  }
}
