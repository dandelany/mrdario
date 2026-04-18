import * as React from "react";

import {
  GridObjectType,
  GameColor,
  GridObjectPillPartType,
  GridObjectPillHalfType
} from "mrdario-core/lib/game/types";

import pillHalfOrange from "@/svg2/pill_half_orange.svg";
import pillHalfPurple from "@/svg2/pill_half_purple.svg";
import pillHalfGreen from "@/svg2/pill_half_green.svg";
import pillSegmentOrange from "@/svg2/pill_segment_orange.svg";
import pillSegmentPurple from "@/svg2/pill_segment_purple.svg";
import pillSegmentGreen from "@/svg2/pill_segment_green.svg";

type PillPartAssetByColor = { [C in GameColor]: string };

const pillHalves: PillPartAssetByColor = {
  [GameColor.Color1]: pillHalfOrange,
  [GameColor.Color2]: pillHalfPurple,
  [GameColor.Color3]: pillHalfGreen
};

const pillSegments: PillPartAssetByColor = {
  [GameColor.Color1]: pillSegmentOrange,
  [GameColor.Color2]: pillSegmentPurple,
  [GameColor.Color3]: pillSegmentGreen
};

const pillHalfRotations: { [P in GridObjectPillHalfType]: number } = {
  [GridObjectType.PillTop]: 0,
  [GridObjectType.PillRight]: 90,
  [GridObjectType.PillBottom]: 180,
  [GridObjectType.PillLeft]: 270
};

interface PillPartProps {
  type: GridObjectPillPartType;
  color: GameColor;
  cellSize: number;
  gProps: {
    transform?: string;
  };
  svgProps: React.SVGProps<SVGImageElement>;
}

export default class PillPart extends React.Component<PillPartProps> {
  static defaultProps = {
    color: GameColor.Color1,
    cellSize: 36,
    gProps: {},
    svgProps: {}
  };

  render() {
    const { type, color, cellSize, svgProps } = this.props;
    let { gProps } = this.props;
    let assetUrl;

    if (type === GridObjectType.PillSegment) {
      assetUrl = pillSegments[color];
    } else {
      assetUrl = pillHalves[color];
      gProps = {
        ...gProps,
        transform: `${gProps.transform || ""} rotate(${pillHalfRotations[type] || 0} ${cellSize / 2} ${cellSize / 2})`
      };
    }

    if (!assetUrl) return null;

    return (
      <g {...gProps}>
        <image
          {...svgProps}
          href={assetUrl}
          xlinkHref={assetUrl}
          width={cellSize}
          height={cellSize}
        />
      </g>
    );
  }
}
