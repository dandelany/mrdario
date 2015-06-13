import React from 'react';
import cx from 'classnames';
import { GRID_OBJECTS } from 'constants';

import virusOrange from 'raw!app/svg/virus_orange.svg';
import virusPurple from 'raw!app/svg/virus_purple.svg';
import virusGreen from 'raw!app/svg/virus_green.svg';
import pillOrange from 'raw!app/svg/pill_orange.svg';
import pillPurple from 'raw!app/svg/pill_purple.svg';
import pillGreen from 'raw!app/svg/pill_green.svg';
import destroyed from 'raw!app/svg/destroyed.svg';

const viruses = [virusOrange, virusPurple, virusGreen];
const pillSegments = [pillOrange, pillPurple, pillGreen];

const pillTypes = [
    GRID_OBJECTS.PILL_SEGMENT,
    GRID_OBJECTS.PILL_TOP, GRID_OBJECTS.PILL_BOTTOM, GRID_OBJECTS.PILL_LEFT, GRID_OBJECTS.PILL_RIGHT
];
const pillRotations = {
    [GRID_OBJECTS.PILL_SEGMENT]: 0,
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
                        } else if(_.includes(pillTypes, cell.type)) {
                            svgString = pillSegments[cell.color % pillSegments.length];
                            transform += `rotate(${pillRotations[cell.type]} ${cellSize/2} ${cellSize/2})`;
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



//const Playfield = React.createClass({
//    getDefaultProps() {
//        return {
//            cellSize: 30
//        }
//    },
//    render() {
//        const numRows = this.props.grid.length;
//        const numCols = this.props.grid[0].length;
//        const cellSize = this.props.cellSize;
//
//        return <div
//            className="game-playfield"
//            style={{position: 'relative', width: numCols * cellSize, height: numRows * cellSize}}
//            >
//            {this.props.grid.map((row, rowI) => {
//                return row.map((cell, colI) => {
//                    const className = cx('game-grid-cell',
//                        _.isUndefined(cell.type) ? null : `grid-type-${cell.type.toLowerCase()}`,
//                        _.isUndefined(cell.color) ? null : `grid-color-${cell.color}`
//                    );
//                    return <div
//                        className={className}
//                        style={{
//                            position: 'absolute',
//                            width: cellSize,
//                            height: cellSize,
//                            top: rowI * cellSize,
//                            left: colI * cellSize
//                            }}
//                        >
//                    </div>
//                })
//            })}
//        </div>;
//    }
//});

export default Playfield;