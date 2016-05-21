import React from 'react';
import _ from 'lodash';
import {Link, withRouter} from 'react-router';
import DeepDiff from 'deep-diff';
const deepDiff = DeepDiff.diff;
import shallowEqual from '../../utils/shallowEqual';

import SinglePlayerGameController from 'game/SinglePlayerGameController';
//import SinglePlayerGameController from 'game/SinglePlayerNetworkGameController';
import Playfield from 'app/components/Playfield';
import MayaNumeral from 'app/components/MayaNumeral';
import responsiveGame from 'app/components/responsiveGame';

const WonOverlay = (props) => {
  const {style, params} = props;
  const level = parseInt(params.level || 0);
  const speed = parseInt(params.speed || 0);
  const nextLevelPath = `/game/level/${level + 1}/speed/${speed}`;

  return <div className="game-overlay" style={style}>
    <div className="win-lose-symbol win-symbol">
      <MayaNumeral value={level} size={40}/>
      <h2>WIN</h2>
    </div>

    <div>
      <Link to={nextLevelPath}>
        <span className="btn-white">
          <div className="btn-maya-numeral" style={{marginBottom: 10}}>
            <MayaNumeral value={level + 1} size={20}/>
          </div>
          Next Level &raquo;
        </span>
      </Link>
    </div>
    <div>
      <Link to="/">
        <span className="btn-white">Back to Menu</span>
      </Link>
    </div>
  </div>;
};

const LostOverlay = (props) => {
  const {style, params} = props;
  const level = parseInt(params.level || 0);
  const speed = parseInt(params.speed || 0);
  const thisLevelPath = `/game/level/${level}/speed/${speed}`;

  return <div className="game-overlay" style={style}>
    <div className="win-lose-symbol lose-symbol">
      <MayaNumeral value={params.level} size={40}/>
      <h2>GAME OVER</h2>
    </div>

    <div>
      <Link to={thisLevelPath}>
        <span className="btn-white">
          <div className="btn-maya-numeral" style={{marginBottom: 10}}>
            <MayaNumeral value={level} size={20}/>
          </div>
          Try Again
        </span>
      </Link>
    </div>
    <div>
      <Link to="/">
        <span className="btn-white">Back to Menu</span>
      </Link>
    </div>
  </div>
};

class SinglePlayerGame extends React.Component {
  static defaultProps = {
    cellSize: 32,
    heightPercent: .85,
    padding: 15
  };

  state = {
    gameState: null,
    mode: null,
  };

  componentDidMount() {
    // mode means won or lost, no mode = playing
    if(!this.props.params.mode) this._initGame(this.props);
  }
  componentWillUnmount() {
    if(this.game && this.game.cleanup) this.game.cleanup();
  }

  componentWillReceiveProps(newProps) {
    const {params} = this.props;
    const hasChanged = (key) => _.get(this.props, key) !== _.get(newProps, key);

    const shouldInitGame = hasChanged('params.level') || hasChanged('params.speed') ||
      (hasChanged('params.mode') && !newProps.params.mode);

    if(shouldInitGame) this._initGame(newProps);

    // if(hasChanged('params.level') || hasChanged('params.level')) this._initGame();
    // else if(hasChanged('params.mode') && !newProps.params.mode)
    // console.log('level', hasChanged('params.level'));
    // console.log('speed', hasChanged('params.speed'));
    // console.log('mode', hasChanged('params.mode'));
  }

  shouldComponentUpdate(newProps, newState) {
    const hasChanged =
      !_.every(newState, (value, key) => shallowEqual(value, this.state[key])) ||
      !shallowEqual(newProps, this.props);

    return hasChanged;
    // console.log(newState);
    // if(shallowEqual(this.props, newProps) && shallowEqual(this.state, newState)) console.log('YO');
    // console.log('props', shallowEqual(this.props, newProps), 'state', shallowEqual(this.state, newState));
    // console.log(deepDiff(this.state, newState));
    return true;
  }


  _initGame(props) {
    if(this.game && this.game.cleanup) this.game.cleanup();

    const {params, router} = props;
    const level = parseInt(params.level) || 0;
    const speed = parseInt(params.speed) || 15;

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new SinglePlayerGameController({
      level, speed,
      render: (gameState) => this.setState({gameState}),
      onChangeMode: (event, lastMode, newMode) => {
        // this.setState({mode: newMode});
        if(newMode === "LOST")
          router.push(`/game/level/${level}/speed/${speed}/lost`);
        else if(newMode === "WON")
          router.push(`/game/level/${level}/speed/${speed}/won`);
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
    // const numRows = _.get(gameState, 'grid.length', 16);
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

export default withRouter(responsiveGame(SinglePlayerGame));
