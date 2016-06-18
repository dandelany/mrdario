import _ from 'lodash';
import React from 'react';

import SVGShimmerCycler from 'app/components/lib/SVGShimmerCycler'

import aztecCalendar from 'app/img/aztec_small.svg';

const oranges = ["#BE1E2D", "#F05A28", "#F6921E"];
const greens = ["#009345", "#006838", "#8BC53F", "#37B34A"];
const purples = ["#5251A1", "#A376CD",  "#744B9D", "#7A6ED4"];
const colorGroups = [undefined, oranges, greens, purples];


export default class AztecCalendar extends React.Component {
  static propTypes = {
    mode: React.PropTypes.oneOf([undefined, 'title', 'won', 'lost'])
  };

  static defaultProps = {
    mode: undefined,
    shouldAnimate: true,
    width: 600,
    height: 600,
    cycleTime: 2000,
  };

  static modeShimmerProps = {
    defaults: {
      colorSets: [undefined]
    },
    title: {
      colorSets: colorGroups,
      cycleTime: 1500,
      repeat: true
    },
    won: {
      colorSets: colorGroups.concat(undefined),
      shapesPerFrame: 10,
      cycleTime: 0,
      repeat: false
    },
    lost: {
      colorSets: [['#000000']],
      shapesPerFrame: 8
    }
  };

  render() {
    const {mode, width, height} = this.props;
    const shimmerProps = _.get(AztecCalendar.modeShimmerProps, mode, AztecCalendar.modeShimmerProps.defaults);

    return <div className="aztec-calendar">
      <SVGShimmerCycler
        {...{
          svgPath: aztecCalendar,
          colorSets: colorGroups,
          shapesPerFrame: 4,
          width, height,
          ...shimmerProps
        }}
      />
    </div>;
  }
}
