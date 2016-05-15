import { MODES, SPEED_LEVELS } from '../constants';
import React from 'react';
import cx from 'classnames';
import Router from 'react-router';

import routes from './routes';
import Playfield from './components/Playfield';
import TitlePage from './components/pages/TitlePage';

const MrDario = React.createClass({
  render() {
    let contents;
    const {mode} = this.props;
    switch(mode) {
      case MODES.READY:
        contents = <div className="game-title">
          <h3>Welcome to Mr. Dario!</h3>
          <h4>Keyboard controls:</h4>
          <div>
            <p>Arrow keys to move</p>
            <p><strong>A</strong> and <strong>S</strong> to rotate</p>
          </div>
          <h4>Press spacebar to play</h4>
        </div>;
        break;

      case MODES.PLAYING:
      case MODES.WON:
      case MODES.LOST:
        contents = <Playfield grid={this.props.grid}></Playfield>;
        break;
    }

    if(mode === MODES.WON || mode === MODES.LOST) {
      contents = <div>
        <h2>You {mode}!</h2>
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



class OldApp {
  constructor(el) {
    this.el = el;
    this.game = null;
  }

  onStartGame() {

  }

  render(gameState, dt) {
    const {mode, grid} = gameState;
    React.render(<MrDario {...gameState} />, this.el);
  }
}

export default class App {
  constructor(el) {
    this.el = el;
    this.router = Router.run(routes, Router.HashLocation, (Handler) => {
      React.render(<Handler />, this.el);
    })
  }
}
