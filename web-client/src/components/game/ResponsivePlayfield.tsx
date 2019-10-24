import * as React from "react";
import ContainerDimensions, { Dimensions } from "react-container-dimensions";

import { GameGrid } from "mrdario-core";

import Playfield from "@/components/game/Playfield";

interface ResponsivePlayfieldProps {
  grid: GameGrid;
  heightPercent: number;
  padding: number;
}

export class ResponsivePlayfield extends React.PureComponent<ResponsivePlayfieldProps> {
  static defaultProps = {
    heightPercent: 0.85,
    padding: 0
  };

  render() {
    const { heightPercent, padding, grid } = this.props;
    // padding is % of gridCell size, not pixels

    // todo should be based on width too
    return (
      <ContainerDimensions>
        {({ height }: Dimensions): React.ReactNode => {
          if (height === 0) return null;
          const gridRows = grid.length - 1;

          const cellSize = Math.floor((height * heightPercent) / (gridRows + 2 * padding));

          // const cellSize = Math.floor(((height - padding * 2) * heightPercent) / gridRows);
          return <Playfield {...this.props} cellSize={cellSize} />;
        }}
      </ContainerDimensions>
    );
  }
}
