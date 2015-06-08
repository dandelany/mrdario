import React from 'react';
import cx from 'classnames';

const Playfield = React.createClass({
    getDefaultProps() {
        return {
            cellSize: 30
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
            {this.props.grid.map((row, rowI) => {
                return row.map((cell, colI) => {
                    const className = cx('game-grid-cell',
                        _.isUndefined(cell.type) ? null : `grid-type-${cell.type.toLowerCase()}`,
                        _.isUndefined(cell.color) ? null : `grid-color-${cell.color}`
                    );
                    return <div
                        className={className}
                        style={{
                            position: 'absolute',
                            width: cellSize,
                            height: cellSize,
                            top: rowI * cellSize,
                            left: colI * cellSize
                            }}
                        >
                    </div>
                })
            })}
        </div>;
    }
});

export default Playfield;