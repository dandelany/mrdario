import { MODES } from '../constants';
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

const MrDario = React.createClass({
    render() {
        let contents = this.props.mode;
        switch(this.props.mode) {
            case MODES.LOADING:
                contents = <div className="game-loading">Loading...</div>;
                break;
            case MODES.TITLE:
                contents = <div className="game-title">
                    <h3>Welcome to Mr. Dario!</h3>
                    <h4>Press spacebar to play</h4>
                </div>;
                break;
            case MODES.PLAYING:
            case MODES.WON:
            case MODES.LOST:
                contents = <Playfield grid={this.props.grid}></Playfield>
                break;
        }

        if(this.props.mode === MODES.WON || this.props.mode === MODES.LOST) {
            contents = <div>
                <h2>You {this.props.mode}!</h2>
                <h3>Press spacebar to reset</h3>
                {contents}
            </div>;
        }

        return <div>
            <h2>Mr Dario</h2>
            <div className="game-container">
                {contents}
            </div>
        </div>
    }
});

export default class App {
    constructor(el) {
        this.el = el;
    }
    render(gameState, dt) {
        const {mode, grid} = gameState;
        React.render(<MrDario {...gameState} />, this.el);
    }
}