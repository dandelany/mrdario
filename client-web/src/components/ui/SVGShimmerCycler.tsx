import * as _ from "lodash";
import * as React from "react";

import SVGShimmerFills from "./SVGShimmerFills";

interface SVGShimmerCyclerProps {
  svgPath: string;
  width: number;
  height: number;
  colorSets: Array<Array<string> | undefined>;
  cycleTime: number;
  repeat: boolean;
  shapesPerFrame: number;
}
interface SVGShimmerCyclerState {
  colorSetIndex: number;
}

export default class SVGShimmerCycler extends React.Component<SVGShimmerCyclerProps, SVGShimmerCyclerState> {
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

  _isTransitioning: boolean = false;
  _queuedState?: SVGShimmerCyclerState;
  _cycleInterval?: number;

  componentDidMount() {
    this._initCycle();

    const { colorSets } = this.props;
    if (!_.isUndefined(colorSets) && !_.isEqual(colorSets, [undefined])) this._isTransitioning = true;
  }
  componentWillUnmount() {
    this._stopCycle();
  }
  componentWillReceiveProps(newProps: SVGShimmerCyclerProps) {
    if (!_.isEqual(newProps.colorSets, this.props.colorSets)) {
      const resetColorSetIndex = { colorSetIndex: 0 };
      if (this._isTransitioning) this._queuedState = resetColorSetIndex;
      else this.setState(resetColorSetIndex);
    }
  }

  _stopCycle = () => {
    if (this._cycleInterval) clearTimeout(this._cycleInterval);
  };

  _initCycle = () => {
    this._stopCycle();
    this._cycleInterval = window.setTimeout(this._cycleColors, this.props.cycleTime);
  };

  _cycleColors = () => {
    const { colorSets } = this.props;
    const newColorSetIndex = (this.state.colorSetIndex + 1) % colorSets.length;
    this._isTransitioning = true;
    this.setState({ colorSetIndex: newColorSetIndex });
  };

  _onFinishShimmer = () => {
    this._isTransitioning = false;

    if (this._queuedState) {
      this.setState(this._queuedState);
      this._queuedState = undefined;
    } else {
      const { colorSets, repeat } = this.props;
      const shouldCycle = colorSets.length > 1 && (repeat || this.state.colorSetIndex < colorSets.length - 1);
      if (shouldCycle) this._initCycle();
    }
  };

  render() {
    const { svgPath, width, height, colorSets, shapesPerFrame } = this.props;
    const colors = colorSets[this.state.colorSetIndex % colorSets.length];

    return (
      <SVGShimmerFills
        onFinish={this._onFinishShimmer}
        svgPath={svgPath}
        shapesPerFrame={shapesPerFrame}
        colors={colors}
        width={width}
        height={height}
      />
    );
  }
}
