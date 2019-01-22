import React from 'react';
import _ from 'lodash';
import {Link, withRouter, Redirect} from 'react-router-dom';
import DeepDiff from 'deep-diff';
const deepDiff = DeepDiff.diff;
import shallowEqual from '../../utils/shallowEqual';

import {MODES, DEFAULT_KEYS, GRID_OBJECTS} from 'game/constants';

import KeyManager from 'app/inputs/KeyManager';
import SwipeManager from 'app/inputs/SwipeManager';
import GamepadManager from 'app/inputs/GamepadManager';
import SingleGameController from 'game/SingleGameController.js';
//import SinglePlayerGameController from 'game/SinglePlayerNetworkGameController';

import Playfield from 'app/components/Playfield';
import PillPreviewPanel from 'app/components/game/PillPreviewPanel';
import WonOverlay from 'app/components/overlays/WonOverlay';
import LostOverlay from 'app/components/overlays/LostOverlay';
import responsiveGame from 'app/components/responsiveGame';

function getName() {
  return window.localStorage ?
    (window.localStorage.getItem('mrdario-name') || 'Anonymous') : 'Anonymous';
}


class SinglePlayerGame extends React.Component {
  static defaultProps = {
    cellSize: 32,
    heightPercent: .85,
    padding: 15
  };

  state = {
    gameState: null,
    highScores: null,
    rank: null,
    pendingMode: null
  };

  componentDidMount() {
    // mode means won or lost, no mode = playing
    if(!_.get(this.props, 'params.match.mode')) this._initGame(this.props);
  }
  componentWillUnmount() {
    // this.props.socket.off('singleHighScores', this._highScoreHandler);
    if(this.game && this.game.cleanup) this.game.cleanup();
  }

  componentWillReceiveProps(newProps) {
    const {params} = this.props.match;
    const hasChanged = (key) => _.get(this.props, key) !== _.get(newProps, key);
    const shouldInitGame =
      hasChanged('match.params.level') || hasChanged('match.params.speed') ||
      (hasChanged('match.params.mode') && !_.get(newProps, 'match.params.mode'));

    if(shouldInitGame) this._initGame(newProps);

    if(!params.mode && this.state.pendingMode) {
      this.setState({pendingMode: null});
    }
  }

  shouldComponentUpdate(newProps, newState) {
    const hasChanged =
      !_.every(newState, (value, key) => shallowEqual(value, this.state[key])) ||
      !shallowEqual(newProps, this.props);

    return hasChanged;
  }


  _initGame(props) {
    if(this.game && this.game.cleanup) this.game.cleanup();

    const {router, socket} = props;
    const {params} = props.match;
    const level = parseInt(params.level) || 0;
    const speed = parseInt(params.speed) || 15;

    if(socket) {
      socket.emit('infoStartGame', [getName(), level, speed], _.noop);
    }

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
        if(_.includes([MODES.Lost, MODES.Won], newMode)) {
          this.setState({pendingMode: newMode.toLowerCase()});
          if(newMode === MODES.Won) this._handleWin();
          if(newMode === MODES.Lost) this._handleLose();
        }
        if(this.props.onChangeMode) this.props.onChangeMode(newMode);
      }
    });
    this.game.play();
  }

  _handleWin() {
    const score = _.get(this, 'state.gameState.score');
    const level = parseInt(_.get(this, 'props.match.params.level'));
    const name = getName();

    if(_.isFinite(level) && _.isFinite(score) && _.get(this, 'props.socket.state')) {
      console.log('socket is open, sending score');
      this.props.socket.emit('singleGameScore', [level, name, score], (err, data) => {
        if(err) throw new Error(err);
        const {scores, rank} = data;
        console.log('high scores received!', scores, rank);
        this.setState({highScores: scores, rank: rank});
      });
    }
  }

  _handleLose() {
    const {socket} = this.props;
    const {params} = this.props.match;
    const level = parseInt(params.level) || 0;
    const speed = parseInt(params.speed) || 15;
    const score = _.get(this, 'state.gameState.score');

    if(socket) {
      socket.emit('infoLostGame', [getName(), level, speed, score], _.noop);
    }
  }

  render() {
    const {gameState, highScores, rank, pendingMode} = this.state;
    const hasGame = this.game && gameState;
    const hasGrid = hasGame && gameState.grid;
    // if(!hasGrid) return <div>loading</div>;

    const {cellSize} = this.props;
    const {params} = this.props.match;
    // pass fractional padding to set padding to a fraction of cell size
    const padding = (padding < 1) ? this.props.padding * cellSize : this.props.padding;
    const numRows = gameState ? gameState.grid.size : 17;
    const numCols = gameState ? gameState.grid.get(0).size : 8;
    const width = (numCols * cellSize) + (padding * 2);
    // make shorter by one row to account for special unplayable top row
    const height = ((numRows - 1) * cellSize) + (padding * 2);

    const style = {position: 'relative', width, height, padding};
    const overlayStyle = {position: 'absolute', width, height, padding, left: 0};

    const lostOverlayStyle = {...overlayStyle, top: (params.mode === "lost") ? 0 : height};
    const wonOverlayStyle = {...overlayStyle, top: (params.mode === "won") ? 0 : height};
    
    let nextPill;
    if(gameState && gameState.pillSequence && _.isFinite(gameState.pillCount)) {
      const pillIndex = gameState.pillCount % gameState.pillSequence.length;
      nextPill = gameState.pillSequence[pillIndex];
    }

    return <div className="game-playfield-container">
      {(pendingMode && pendingMode !== params.mode) ?
        // if game has been won or lost, redirect to the proper URL
        <Redirect push to={`/game/level/${params.level}/speed/${params.speed}/${pendingMode}`}/> :
        null
      }
      <div {...{style, className: 'game-playfield'}}>
        <WonOverlay {...{gameState, highScores, rank, params, style: wonOverlayStyle}} />
        <LostOverlay {...{gameState, params, style: lostOverlayStyle}} />
        {hasGrid ?
          <Playfield grid={gameState.grid} cellSize={cellSize} />
          : ''}
      </div>
      
      {gameState ?
        <div className="score-panel">
          <h5>SCORE</h5>
          {gameState.score}
        </div>
        : null
      }
      
      {nextPill ?
        <PillPreviewPanel {...{cellSize, pill: nextPill}} />
        : null
      }
    </div>;
  }
}

export default withRouter(responsiveGame(SinglePlayerGame));
