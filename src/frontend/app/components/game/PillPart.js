import _ from 'lodash';
import React from 'react';
import shallowEqual from 'app/utils/shallowEqual';
import makeReactSvg from 'app/utils/makeReactSvg';

import { GRID_OBJECTS, COLORS } from 'game/constants';

import pillHalfOrange from 'raw!app/svg/pill_half_orange.svg';
import pillHalfPurple from 'raw!app/svg/pill_half_purple.svg';
import pillHalfGreen from 'raw!app/svg/pill_half_green.svg';
import pillSegmentOrange from 'raw!app/svg/pill_segment_orange.svg';
import pillSegmentPurple from 'raw!app/svg/pill_segment_purple.svg';
import pillSegmentGreen from 'raw!app/svg/pill_segment_green.svg';

const pillHalfSvgs = [pillHalfOrange, pillHalfPurple, pillHalfGreen];
const pillHalves = _.fromPairs(COLORS.map((color, i) => [color, pillHalfSvgs[i % pillHalfSvgs.length]]));
const pillSegmentSvgs = [pillSegmentOrange, pillSegmentPurple, pillSegmentGreen];
const pillSegments = _.fromPairs(COLORS.map((color, i) => [color, pillSegmentSvgs[i % pillSegmentSvgs.length]]));

const pillHalfTypes =
  [GRID_OBJECTS.PILL_TOP, GRID_OBJECTS.PILL_BOTTOM, GRID_OBJECTS.PILL_LEFT, GRID_OBJECTS.PILL_RIGHT];

const pillHalfRotations = {
  [GRID_OBJECTS.PILL_TOP]: 0,
  [GRID_OBJECTS.PILL_RIGHT]: 90,
  [GRID_OBJECTS.PILL_BOTTOM]: 180,
  [GRID_OBJECTS.PILL_LEFT]: 270
};


export default class PillPart extends React.Component {
  static propTypes = {
    type: React.PropTypes.oneOf([GRID_OBJECTS.PILL_SEGMENT, ...pillHalfTypes]).isRequired,
    color: React.PropTypes.oneOf(COLORS),
    cellSize: React.PropTypes.any,
    gProps: React.PropTypes.object,
    svgProps: React.PropTypes.object
  };
  static defaultProps = {
    color: COLORS[0],
    cellSize: 36,
    gProps: {},
    svgProps: {}
  };

  render() {
    const {type, color, cellSize, svgProps} = this.props;
    let {gProps} = this.props;
    let svgString;

    if(type === GRID_OBJECTS.PILL_SEGMENT) {
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
