import _ from 'lodash';
import React from 'react';

import SVGShimmerFills from 'app/components/lib/SVGShimmerFills';

export default class SVGShimmerCycler extends React.Component {
  static propTypes = {
    svgPath: React.PropTypes.string,
    width: React.PropTypes.number,
    height: React.PropTypes.number,
    colorSets: React.PropTypes.array,
    cycleTime: React.PropTypes.number,
    repeat: React.PropTypes.bool
  };
  static defaultProps = {
    width: 600,
    height: 600,
    colorSets: [undefined],
    cycleTime: 1000,
    repeat: true,
    shapesPerFrame: 4
  };

  state = {
    colorSetIndex: 0
  };

  componentDidMount() {
    this._initCycle();

    const {colorSets} = this.props;
    if(!_.isUndefined(colorSets) && !_.isEqual(colorSets, [undefined]))
      this.isTransitioning = true
  }
  componentWillUnmount() {
    this._stopCycle();
  }
  componentWillReceiveProps(newProps) {
    if(!_.isEqual(newProps.colorSets, this.props.colorSets)) {
      const resetColorSetIndex = {colorSetIndex: 0};
      if(this.isTransitioning) this.queuedState = resetColorSetIndex;
      else this.setState(resetColorSetIndex);
    }
  }

  _stopCycle = () => {
    if(this.cycleInterval) clearTimeout(this.cycleInterval);
  };

  _initCycle = () => {
    this._stopCycle();
    this.cycleInterval = setTimeout(this._cycleColors, this.props.cycleTime);
  };

  _cycleColors = () => {
    const {colorSets} = this.props;
    const newColorSetIndex = (this.state.colorSetIndex + 1) % colorSets.length;
    this.isTransitioning = true;
    this.setState({colorSetIndex: newColorSetIndex});
  };

  _onFinishShimmer = () => {
    this.isTransitioning = false;

    if(this.queuedState) {
      this.setState(this.queuedState);
      this.queuedState = null;

    } else {
      const {colorSets, repeat} = this.props;
      const shouldCycle = (
        colorSets.length > 1 &&
        (repeat || this.state.colorSetIndex < (colorSets.length - 1))
      );
      if(shouldCycle) this._initCycle();
    }
  };

  render() {
    const {svgPath, width, height, colorSets, shapesPerFrame} = this.props;
    const colors = colorSets[this.state.colorSetIndex % colorSets.length];

    return <SVGShimmerFills
      onFinish={this._onFinishShimmer}
      svgPath={svgPath}
      shapesPerFrame={shapesPerFrame}
      colors={colors}
      width={width}
      height={height}
    />;
  }
}
