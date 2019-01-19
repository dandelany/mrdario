import * as _ from 'lodash';
import * as React from 'react';
import makeReactSvg from '../../utils/makeReactSvg';

import { GridObject, GameColor } from "@/game/constants";

import * as pillHalfOrange from '!raw-loader!../../svg/pill_half_orange.svg';
import * as pillHalfPurple from '!raw-loader!app/svg/pill_half_purple.svg';
import * as pillHalfGreen from '!raw-loader!app/svg/pill_half_green.svg';
import * as pillSegmentOrange from '!raw-loader!app/svg/pill_segment_orange.svg';
import * as pillSegmentPurple from '!raw-loader!app/svg/pill_segment_purple.svg';
import * as pillSegmentGreen from '!raw-loader!app/svg/pill_segment_green.svg';


type PillPartSVGByColor = {[C in GameColor]: string};

const pillHalves: PillPartSVGByColor = {
  [GameColor.Orange]: pillHalfOrange,
  [GameColor.Purple]: pillHalfPurple,
  [GameColor.Green]: pillHalfGreen
};

const pillSegments: PillPartSVGByColor = {
  [GameColor.Orange]: pillSegmentOrange,
  [GameColor.Purple]: pillSegmentPurple,
  [GameColor.Green]: pillSegmentGreen
};

type PillHalfType = GridObject.PillTop | GridObject.PillBottom | GridObject.PillLeft | GridObject.PillRight;
type PillPartType = PillHalfType | GridObject.PillSegment;

const pillHalfRotations: {[P in PillHalfType]: number} = {
  [GridObject.PillTop]: 0,
  [GridObject.PillRight]: 90,
  [GridObject.PillBottom]: 180,
  [GridObject.PillLeft]: 270
};

interface PillPartProps {
  type: PillPartType,
  color: GameColor,
  cellSize: number,
  gProps: {
    transform?: string
  },
  svgProps: object
}

export default class PillPart extends React.Component<PillPartProps> {
  static defaultProps = {
    color: GameColor.Orange,
    cellSize: 36,
    gProps: {
    },
    svgProps: {}
  };

  render() {
    const {type, color, cellSize, svgProps} = this.props;
    let {gProps} = this.props;
    let svgString;

    if(type === GridObject.PillSegment) {
      svgString = pillSegments[color];

    } else {
      svgString = pillHalves[color];
      gProps = {
        ...gProps,
        transform: `${gProps.transform || ''} rotate(${pillHalfRotations[type] || 0} ${cellSize / 2} ${cellSize / 2})`
      };
    }

    return svgString ?
      makeReactSvg(svgString, gProps, svgProps)
      : null;
  }
}
