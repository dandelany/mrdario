import * as React from "react";
import makeReactSvg from "@/utils/makeReactSvg";

import { GridObjectType, GameColor, GridObjectPillPartType, GridObjectPillHalfType } from "mrdario-core/lib/game/types";

import * as pillHalfOrange from "!raw-loader!@/svg/pill_half_orange.svg";
import * as pillHalfPurple from "!raw-loader!@/svg/pill_half_purple.svg";
import * as pillHalfGreen from "!raw-loader!@/svg/pill_half_green.svg";
import * as pillSegmentOrange from "!raw-loader!@/svg/pill_segment_orange.svg";
import * as pillSegmentPurple from "!raw-loader!@/svg/pill_segment_purple.svg";
import * as pillSegmentGreen from "!raw-loader!@/svg/pill_segment_green.svg";

type PillPartSVGByColor = { [C in GameColor]: string };

const pillHalves: PillPartSVGByColor = {
  [GameColor.Color1]: pillHalfOrange,
  [GameColor.Color2]: pillHalfPurple,
  [GameColor.Color3]: pillHalfGreen
};

const pillSegments: PillPartSVGByColor = {
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
  svgProps: object;
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
    let svgString;

    if (type === GridObjectType.PillSegment) {
      svgString = pillSegments[color];
    } else {
      svgString = pillHalves[color];
      gProps = {
        ...gProps,
        transform: `${gProps.transform || ""} rotate(${pillHalfRotations[type] || 0} ${cellSize / 2} ${cellSize / 2})`
      };
    }

    return svgString ? makeReactSvg(svgString, gProps, svgProps) : null;
  }
}
