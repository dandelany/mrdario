import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import shallowEqual from 'app/utils/shallowEqual';
import makeReactSvg from 'app/utils/makeReactSvg';

import { GRID_OBJECTS, COLORS } from 'game/constants';

import pillHalfOrange from 'raw-loader!app/svg/pill_half_orange.svg';
import pillHalfPurple from 'raw-loader!app/svg/pill_half_purple.svg';
import pillHalfGreen from 'raw-loader!app/svg/pill_half_green.svg';
import pillSegmentOrange from 'raw-loader!app/svg/pill_segment_orange.svg';
import pillSegmentPurple from 'raw-loader!app/svg/pill_segment_purple.svg';
import pillSegmentGreen from 'raw-loader!app/svg/pill_segment_green.svg';

const pillHalfSvgs = [pillHalfOrange, pillHalfPurple, pillHalfGreen];
const pillHalves = _.fromPairs(COLORS.map((color, i) => [color, pillHalfSvgs[i % pillHalfSvgs.length]]));
const pillSegmentSvgs = [pillSegmentOrange, pillSegmentPurple, pillSegmentGreen];
const pillSegments = _.fromPairs(COLORS.map((color, i) => [color, pillSegmentSvgs[i % pillSegmentSvgs.length]]));

const pillHalfTypes =
  [GRID_OBJECTS.PillTop, GRID_OBJECTS.PillBottom, GRID_OBJECTS.PillLeft, GRID_OBJECTS.PillRight];

const pillHalfRotations = {
  [GRID_OBJECTS.PillTop]: 0,
  [GRID_OBJECTS.PillRight]: 90,
  [GRID_OBJECTS.PillBottom]: 180,
  [GRID_OBJECTS.PillLeft]: 270
};


export default class PillPart extends React.Component {
  static propTypes = {
    type: PropTypes.oneOf([GRID_OBJECTS.PillSegment, ...pillHalfTypes]).isRequired,
    color: PropTypes.oneOf(COLORS),
    cellSize: PropTypes.any,
    gProps: PropTypes.object,
    svgProps: PropTypes.object
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

    if(type === GRID_OBJECTS.PillSegment) {
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
