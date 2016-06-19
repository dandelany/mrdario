import _ from 'lodash';
import React from 'react';
import shallowEqual from 'app/utils/shallowEqual';
import makeReactSvg from 'app/utils/makeReactSvg';

import PillPart from 'app/components/game/PillPart';

import { GRID_OBJECTS } from 'game/constants';

import virusOrange from 'raw!app/svg/virus_orange.svg';
import virusPurple from 'raw!app/svg/virus_purple.svg';
import virusGreen from 'raw!app/svg/virus_green.svg';
import destroyed from 'raw!app/svg/destroyed.svg';

const viruses = [virusOrange, virusPurple, virusGreen];

const pillHalfTypes =
  [GRID_OBJECTS.PILL_TOP, GRID_OBJECTS.PILL_BOTTOM, GRID_OBJECTS.PILL_LEFT, GRID_OBJECTS.PILL_RIGHT];


export default class Playfield extends React.Component {
  static defaultProps = {
    cellSize: 36
  };

  shouldComponentUpdate(newProps) {
    return !shallowEqual(newProps, this.props);
  }

  render() {
    const grid = this.props.grid.toJS();
    // first row of grid is "true" top row which is out of play and should be rendered above the playfield

    const numRows = grid.length;
    const numCols = grid[0].length;
    const cellSize = this.props.cellSize;
    const width = numCols * cellSize;
    const height = numRows * cellSize;

    // translate svg up by one row to account for out-of-sight true top row
    const style = {width, height, transform: `translate(0, ${-cellSize}px)`};

    return <svg style={style}>
      {grid.map((row, rowI) => {
        return _.compact(row.map((cell, colI) => {
          // make individual SVGs for each non-empty grid element
          if(cell.type === GRID_OBJECTS.EMPTY) return null;

          let svgString;
          let transform = `translate(${colI * cellSize}, ${rowI * cellSize})`;

          if(cell.type === GRID_OBJECTS.VIRUS) {
            svgString = viruses[cell.color % viruses.length];

          } else if(cell.type === GRID_OBJECTS.DESTROYED) {
            svgString = destroyed;

          } else if(cell.type === GRID_OBJECTS.PILL_SEGMENT || _.includes(pillHalfTypes, cell.type)) {

            const {type, color} = cell;
            return <PillPart {...{
              type, color, cellSize,
              gProps: {transform},
              svgProps: {width: cellSize, height: cellSize}}}
            />;
          }

          return svgString ?
            makeReactSvg(svgString, {transform}, {width: cellSize, height: cellSize})
            : null;
        }))
      })}
    </svg>;
  }
};
