import * as _ from "lodash";
import * as React from "react";
import shallowEqual from "@/app/utils/shallowEqual";
import makeReactSvg from "@/app/utils/makeReactSvg";

import PillPart from "./PillPart";

import { GameGrid, GridObjectType } from "mrdario-core/src/types";

import * as virusOrange from "!raw-loader!@/app/svg/virus_orange.svg";
import * as virusPurple from "!raw-loader!@/app/svg/virus_purple.svg";
import * as virusGreen from "!raw-loader!@/app/svg/virus_green.svg";
import * as destroyed from "!raw-loader!@/app/svg/destroyed.svg";

const viruses = [virusOrange, virusPurple, virusGreen];

export interface PlayfieldProps {
  cellSize: number;
  grid: GameGrid<number, number>;
}
export default class Playfield extends React.Component<PlayfieldProps> {
  static defaultProps = {
    cellSize: 36
  };

  shouldComponentUpdate(newProps: PlayfieldProps) {
    return !shallowEqual(newProps, this.props);
  }

  render() {
    const grid = this.props.grid;
    // first row of grid is "true" top row which is out of play and should be rendered above the playfield

    const numRows = grid.length;
    const numCols = grid[0].length;
    const cellSize = this.props.cellSize;
    const width = numCols * cellSize;
    const height = numRows * cellSize;

    // translate svg up by one row to account for out-of-sight true top row
    const style = { width, height, transform: `translate(0, ${-cellSize}px)` };

    return (
      <svg style={style}>
        {grid.map((row, rowI) => {
          return _.compact(
            row.map((cell, colI) => {
              // make individual SVGs for each non-empty grid element
              if (cell.type === GridObjectType.Empty) return null;

              let svgString;
              let transform = `translate(${colI * cellSize}, ${rowI * cellSize})`;

              switch (cell.type) {
                case GridObjectType.Virus:
                  svgString = viruses[cell.color % viruses.length];
                  break;

                case GridObjectType.Destroyed:
                  svgString = destroyed;
                  break;

                case GridObjectType.PillSegment:
                case GridObjectType.PillTop:
                case GridObjectType.PillRight:
                case GridObjectType.PillBottom:
                case GridObjectType.PillLeft:
                  const { type, color } = cell;
                  return (
                    <PillPart
                      {...{
                        type,
                        color,
                        cellSize,
                        gProps: { transform },
                        svgProps: { width: cellSize, height: cellSize }
                      }}
                    />
                  );
              }

              return svgString ? makeReactSvg(svgString, { transform }, { width: cellSize, height: cellSize }) : null;
            })
          );
        })}
      </svg>
    );
  }
}
