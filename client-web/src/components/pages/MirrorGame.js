import React from 'react';
import _ from 'lodash';
import {Link, withRouter} from 'react-router-dom';
import DeepDiff from 'deep-diff';
const deepDiff = DeepDiff.diff;
import shallowEqual from '@/utils/shallowEqual';

import {MODES, DEFAULT_KEYS} from 'game/constants';

import KeyManager from 'app/inputs/KeyManager';
import SwipeManager from 'app/inputs/SwipeManager';
// import SingleGameController from 'game/SingleGameController.js';
import MasterClientGameController from 'game/MasterClientGameController';

import Playfield from 'app/components/Playfield';
import WonOverlay from 'app/components/overlays/WonOverlay';
import LostOverlay from 'app/components/overlays/LostOverlay';
import responsiveGame from 'app/components/responsiveGame';

class MirrorGame extends React.Component {
  static defaultProps = {
    cellSize: 32,
    heightPercent: .85,
    padding: 15
  };

  state = {
    gameState: null
  };

  componentDidMount() {
    this.props.socket.on('newSingleGame', ({id, token}) => {
      console.log('got new game', {id, token});
    });
    this.props.socket.emit('initSingleGame', 'OK');
    
    // mode means won or lost, no mode = playing
    if(!this.props.params.mode) this._initGame(this.props);
  }
  componentWillUnmount() {
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

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new MasterClientGameController({
      socket: this.props.socket,
      level, speed,
      inputManagers: [this.keyManager, this.touchManager],
      render: (gameState) => this.setState({gameState}),
      onChangeMode: (event, lastMode, newMode) => {
        console.log('onchangemode', event, lastMode, newMode);
        if(_.includes([MODES.Lost, MODES.Won], newMode)) {
          router.push(`/mirror/level/${level}/speed/${speed}/${newMode.toLowerCase()}`);
        }
        if(this.props.onChangeMode) this.props.onChangeMode(newMode);
      }
    });
    this.game.play();
  }

  render() {
    const {gameState} = this.state;
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
      <WonOverlay {...{params, style: wonOverlayStyle}} />
      <LostOverlay {...{params, style: lostOverlayStyle}} />
      {hasGrid ?
        <Playfield grid={gameState.grid} cellSize={cellSize} />
        : ''}
    </div>
  }
}

export default withRouter(responsiveGame(MirrorGame));
