import React from 'react';
import _ from 'lodash';
import {Link, withRouter} from 'react-router';
import DeepDiff from 'deep-diff';
const deepDiff = DeepDiff.diff;
import shallowEqual from '../../utils/shallowEqual';

import {MODES, DEFAULT_KEYS} from 'game/constants';

import KeyManager from 'app/inputs/KeyManager';
import SwipeManager from 'app/inputs/SwipeManager';
import GamepadManager from 'app/inputs/GamepadManager';
import SingleGameController from 'game/SingleGameController.js';
//import SinglePlayerGameController from 'game/SinglePlayerNetworkGameController';

import Playfield from 'app/components/Playfield';
import WonOverlay from 'app/components/overlays/WonOverlay';
import LostOverlay from 'app/components/overlays/LostOverlay';
import responsiveGame from 'app/components/responsiveGame';


class SinglePlayerGame extends React.Component {
  static defaultProps = {
    cellSize: 32,
    heightPercent: .85,
    padding: 15
  };

  state = {
    gameState: null,
    highScores: null
  };

  componentDidMount() {
    // mode means won or lost, no mode = playing
    if(!this.props.params.mode) this._initGame(this.props);

    this._highScoreHandler = this.props.socket.on('singleHighScores', (data, res) => {
      console.log('high scores received!');
      console.log(data);
      this.setState({highScores: data});
    })
  }
  componentWillUnmount() {
    this.props.socket.off('singleHighScores', this._highScoreHandler);
    if(this.game && this.game.cleanup) this.game.cleanup();
  }

  componentWillReceiveProps(newProps) {
    const {params} = this.props;
    const hasChanged = (key) => _.get(this.props, key) !== _.get(newProps, key);
    const shouldInitGame =
      hasChanged('params.level') || hasChanged('params.speed') ||
      (hasChanged('params.mode') && !newProps.params.mode);

    if(shouldInitGame) this._initGame(newProps);
  }

  shouldComponentUpdate(newProps, newState) {
    const hasChanged =
      !_.every(newState, (value, key) => shallowEqual(value, this.state[key])) ||
      !shallowEqual(newProps, this.props);

    return hasChanged;
  }


  _initGame(props) {
    if(this.game && this.game.cleanup) this.game.cleanup();

    const {params, router} = props;
    const level = parseInt(params.level) || 0;
    const speed = parseInt(params.speed) || 15;

    // input managers controlling keyboard and touch events
    this.keyManager = new KeyManager(DEFAULT_KEYS);
    this.touchManager = new SwipeManager();
    this.gamepadManager = new GamepadManager();

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new SingleGameController({
      level, speed,
      inputManagers: [this.keyManager, this.touchManager, this.gamepadManager],
      render: (gameState) => this.setState({gameState}),
      onChangeMode: (event, lastMode, newMode) => {
        console.log('onchangemode', event, lastMode, newMode);
        if(_.includes([MODES.LOST, MODES.WON], newMode)) {
          router.push(`/game/level/${level}/speed/${speed}/${newMode.toLowerCase()}`);
          if(newMode === MODES.WON) this._handleWin();
        }
        if(this.props.onChangeMode) this.props.onChangeMode(newMode);
      }
    });
    this.game.play();
  }

  _handleWin() {
    console.log(this.props);
    console.log(this.state.gameState);
    const score = _.get(this, 'state.gameState.score');
    const level = parseInt(_.get(this, 'props.params.level'));
    const name = window.localStorage ?
      (window.localStorage.getItem('mrdario-name') || 'Anonymous') : 'Anonymous';

    if(_.isFinite(level) && _.isFinite(score) && _.get(this, 'props.socket.state') === 'open') {
      console.log('socket is open, sending score');
      // this.props.socket.emit('singleGameScore', `${level}_${name}_${score}`);
      this.props.socket.emit('singleGameScore', [level, name, score]);
    }
  }

  render() {
    const {gameState, highScores} = this.state;
    const hasGame = this.game && gameState;
    const hasGrid = hasGame && gameState.grid;
    // if(!hasGrid) return <div>loading</div>;

    const {cellSize, params} = this.props;
    // pass fractional padding to set padding to a fraction of cell size
    const padding = (padding < 1) ? this.props.padding * cellSize : this.props.padding;
    const numRows = gameState ? gameState.grid.size : 16;
    const numCols = gameState ? gameState.grid.get(0).size : 8;
    const width = (numCols * cellSize) + (padding * 2);
    const height = (numRows * cellSize) + (padding * 2);

    const style = {position: 'relative', width, height, padding};
    const overlayStyle = {position: 'absolute', width, height, padding, left: 0};

    const lostOverlayStyle = {...overlayStyle, top: (params.mode === "lost") ? 0 : height};
    const wonOverlayStyle = {...overlayStyle, top: (params.mode === "won") ? 0 : height};

    return <div {...{style, className: 'game-playfield'}}>
      <WonOverlay {...{gameState, highScores, params, style: wonOverlayStyle}} />
      <LostOverlay {...{gameState, params, style: lostOverlayStyle}} />
      {hasGrid ?
        <Playfield grid={gameState.grid} cellSize={cellSize} />
        : ''}

      {gameState ?
        <div className="score-panel">
          {gameState.score}
        </div>
        : ''
      }
    </div>
  }
}

export default withRouter(responsiveGame(SinglePlayerGame));
