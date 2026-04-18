import * as React from "react";

import { GameGrid } from "mrdario-core";

import Playfield from "@/components/game/Playfield";

interface ResponsivePlayfieldProps {
  grid: GameGrid;
  heightPercent: number;
  padding: number;
}

interface MeasuredSize {
  height: number;
  width: number;
}

function getViewportSize(): MeasuredSize {
  if (typeof window === "undefined") {
    return { height: 0, width: 0 };
  }

  return {
    height: window.innerHeight,
    width: window.innerWidth
  };
}

export class ResponsivePlayfield extends React.PureComponent<ResponsivePlayfieldProps> {
  static defaultProps = {
    heightPercent: 0.85,
    padding: 0
  };

  protected containerRef: React.RefObject<HTMLDivElement> = React.createRef();

  state: MeasuredSize = getViewportSize();

  componentDidMount() {
    this.measure();
    window.addEventListener("resize", this.measure);
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.measure);
  }

  protected measure = () => {
    const element = this.containerRef.current;
    const viewportSize = getViewportSize();

    if (!element) {
      if (viewportSize.height !== this.state.height || viewportSize.width !== this.state.width) {
        this.setState(viewportSize);
      }
      return;
    }

    const nextState = {
      height: element.clientHeight || viewportSize.height,
      width: element.clientWidth || viewportSize.width
    };

    if (nextState.height !== this.state.height || nextState.width !== this.state.width) {
      this.setState(nextState);
    }
  };

  render() {
    const { heightPercent, padding, grid } = this.props;
    // padding is % of gridCell size, not pixels
    const { height } = this.state;
    const gridRows = grid.length - 1;
    const cellSize = height > 0 ? Math.floor((height * heightPercent) / (gridRows + 2 * padding)) : 0;

    // todo should be based on width too
    return (
      <div ref={this.containerRef} style={{ width: "100%", height: "100%" }}>
        {cellSize > 0 ? <Playfield {...this.props} cellSize={cellSize} /> : null}
      </div>
    );
  }
}
