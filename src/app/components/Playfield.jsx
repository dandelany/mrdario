import React from 'react';
import cx from 'classnames';
import { GRID_OBJECTS } from 'constants';

import virusOrange from 'raw!app/svg/virus_orange.svg';
import virusPurple from 'raw!app/svg/virus_purple.svg';
import virusGreen from 'raw!app/svg/virus_green.svg';
//import pillOrange from 'raw!app/svg/pill_orange.svg';
//import pillPurple from 'raw!app/svg/pill_purple.svg';
//import pillGreen from 'raw!app/svg/pill_green.svg';
import destroyed from 'raw!app/svg/destroyed.svg';

import pillHalfOrange from 'raw!app/svg/pill_half_orange.svg';
import pillHalfPurple from 'raw!app/svg/pill_half_purple.svg';
import pillHalfGreen from 'raw!app/svg/pill_half_green.svg';
import pillSegmentOrange from 'raw!app/svg/pill_segment_orange.svg';
import pillSegmentPurple from 'raw!app/svg/pill_segment_purple.svg';
import pillSegmentGreen from 'raw!app/svg/pill_segment_green.svg';


const viruses = [virusOrange, virusPurple, virusGreen];
const pillHalves = [pillHalfOrange, pillHalfPurple, pillHalfGreen];
const pillSegments = [pillSegmentOrange, pillSegmentPurple, pillSegmentGreen];

const pillHalfTypes = [
    GRID_OBJECTS.PILL_TOP, GRID_OBJECTS.PILL_BOTTOM, GRID_OBJECTS.PILL_LEFT, GRID_OBJECTS.PILL_RIGHT
];
const pillHalfRotations = {
    [GRID_OBJECTS.PILL_TOP]: 0,
    [GRID_OBJECTS.PILL_RIGHT]: 90,
    [GRID_OBJECTS.PILL_BOTTOM]: 180,
    [GRID_OBJECTS.PILL_LEFT]: 270
};

const Playfield = React.createClass({
    getDefaultProps() {
        return {
            cellSize: 36
        }
    },
    render() {
        const numRows = this.props.grid.length;
        const numCols = this.props.grid[0].length;
        const cellSize = this.props.cellSize;

        return <div
            className="game-playfield"
            style={{position: 'relative', width: numCols * cellSize, height: numRows * cellSize}}
            >

            <svg style={{width: numCols * cellSize, height: numRows * cellSize}}>
                {this.props.grid.map((row, rowI) => {
                    return row.map((cell, colI) => {
                        let svgString;
                        let transform = '';
                        transform += `translate(${colI * cellSize}, ${rowI * cellSize})`;

                        if(cell.type === GRID_OBJECTS.EMPTY) return;
                        else if(cell.type === GRID_OBJECTS.VIRUS) {
                            svgString = viruses[cell.color % viruses.length];
                        } else if(cell.type === GRID_OBJECTS.DESTROYED) {
                            svgString = destroyed;
                        } else if(cell.type === GRID_OBJECTS.PILL_SEGMENT) {
                            svgString = pillSegments[cell.color % pillSegments.length];
                        } else if(_.includes(pillHalfTypes, cell.type)) {
                            svgString = pillHalves[cell.color % pillSegments.length];
                            transform += `rotate(${pillHalfRotations[cell.type]} ${cellSize/2} ${cellSize/2})`;
                        }

                        return svgString ? makeSvg(svgString,
                            {transform},
                            {width: cellSize, height: cellSize}
                        ) : null;
                    })
                })}
            </svg>
        </div>;
    }
});

function createMarkup(html) { return {__html: html}; }

function makeSvg(svgString, gProps, svgProps) {
    return <g {...gProps}>
            <svg {...svgProps} dangerouslySetInnerHTML={createMarkup(svgString)} />
    </g>;
}

export default Playfield;