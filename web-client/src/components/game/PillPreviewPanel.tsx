import * as React from "react";

import { GameColor, PillColors } from "mrdario-core/lib/game/types";

import pillHalfOrange from "@/svg2/pill_half_orange.svg";
import pillHalfPurple from "@/svg2/pill_half_purple.svg";
import pillHalfGreen from "@/svg2/pill_half_green.svg";

type PillHalfAssetByColor = { [key: string]: string };

const pillHalfAssets: PillHalfAssetByColor = {
  [GameColor.Color1]: pillHalfOrange,
  [GameColor.Color2]: pillHalfPurple,
  [GameColor.Color3]: pillHalfGreen,
  Color1: pillHalfOrange,
  Color2: pillHalfPurple,
  Color3: pillHalfGreen
};

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
    const { pill, cellSize, className } = this.props;

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

        <div style={{ display: "flex", width: cellSize * 2, height: cellSize }}>
          <img
            src={pillHalfAssets[String(pill[0])]}
            width={cellSize}
            height={cellSize}
            alt=""
            style={{ display: "block", transform: "rotate(270deg)" }}
          />
          <img
            src={pillHalfAssets[String(pill[1])]}
            width={cellSize}
            height={cellSize}
            alt=""
            style={{ display: "block", transform: "rotate(90deg)" }}
          />
        </div>

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
