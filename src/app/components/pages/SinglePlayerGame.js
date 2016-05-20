import React from 'react';
import _ from 'lodash';
import {Link, withRouter} from 'react-router';
import DeepDiff from 'deep-diff';
const deepDiff = DeepDiff.diff;

import SinglePlayerGameController from 'game/SinglePlayerGameController';
//import SinglePlayerGameController from 'game/SinglePlayerNetworkGameController';
import Playfield from 'app/components/Playfield';


const WonOverlay = (props) => {
  const {style, params} = props;
  const nextLevelPath = `/game/level/${parseInt(params.level || 0) + 1}/speed/${parseInt(params.speed) || 15}`;

  return <div className="game-overlay" style={style}>
    <h4>WIN</h4>
    <Link to={nextLevelPath}>
      Next Level
    </Link>
  </div>;
};

const LostOverlay = (props) => {
  const {style, params} = props;
  const thisLevelPath = `/game/level/${params.level || 0}/speed/${params.speed || 15}`;

  return <div className="game-overlay" style={style}>
    <h4>LOSE</h4>
    <Link to={thisLevelPath}>
      Try Again
    </Link>
    <Link to="/">
      Back to Menu
    </Link>
  </div>
};

class SinglePlayerGame extends React.Component {
  static defaultProps = {
    cellSize: 36
  };

  state = {
    gameState: null,
    mode: null,
  };

  componentDidMount() {
    this._initGame(this.props);
  }
  componentWillUnmount() {
    this.game.cleanup();
  }

  componentWillReceiveProps(newProps) {
    const {props} = this;
    const {params} = this.props;
    const hasChanged = (key) => _.get(this.props, key) !== _.get(newProps, key);

    const shouldInitGame = hasChanged('params.level') || hasChanged('params.speed') ||
      (hasChanged('params.mode') && !newProps.params.mode);

    console.log(hasChanged('params.level'), hasChanged('params.speed'), (hasChanged('params.mode') && !newProps.params.mode))
    console.log('shouldInit', shouldInitGame);

    if(shouldInitGame) this._initGame(newProps);

    // if(hasChanged('params.level') || hasChanged('params.level')) this._initGame();
    // else if(hasChanged('params.mode') && !newProps.params.mode)
    // console.log('level', hasChanged('params.level'));
    // console.log('speed', hasChanged('params.speed'));
    // console.log('mode', hasChanged('params.mode'));
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
    if(!hasGrid) return <div>loading</div>;

    const numRows = _.get(gameState, 'grid.length', 12);
    const numCols = _.get(gameState, 'grid.0.length', 8);
    const cellSize = this.props.cellSize;
    const width = numCols * cellSize;
    const height = numRows * cellSize;

    const style = {position: 'relative', width, height};
    const overlayStyle = {position: 'absolute', width, height, top: -height};

    const {params} = this.props;
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

export default withRouter(SinglePlayerGame);
