import * as React from "react";
import * as _ from "lodash";
import { RouteComponentProps, withRouter } from "react-router-dom";
import * as cx from "classnames";

import shallowEqual from "@/utils/shallowEqual";

import { DEFAULT_KEYS } from "mrdario-core/lib/game/controller/constants";
import { GameController, GameControllerMode, GameControllerState } from "mrdario-core/lib/game/controller";
import { GameGrid, PillColors, TimedMoveActions } from "mrdario-core/lib/game/types";

import { decodeGameControllerState, encodeGameState } from "mrdario-core/lib/api/game/encoding";
import { GameClient } from "mrdario-core/lib/client/GameClient";
import { GamepadManager, KeyManager, SwipeManager } from "mrdario-core/lib/game/input/web";
import { CreateSingleGameResponse } from "mrdario-core/lib/api/game";
import { SaveScoreResponse } from "mrdario-core/lib/api/scores";

import { GameRouteParams } from "@/types";
import { ResponsiveGameDisplay } from "@/components/game/GameDisplay";
import { GameOptions } from "mrdario-core";
import { encodeTimedActions } from "mrdario-core/lib/api";
import { PuppetGameController } from "mrdario-core/lib/game/controller/PuppetGameController";

const styles = require("./MirrorGame.module.scss");

function getName() {
  return window.localStorage ? window.localStorage.getItem("mrdario-name") || "Anonymous" : "Anonymous";
}

// function shallowishEqual<T extends ArrayLike<unknown>>(a: T, b: T):boolean {
//   return _.every(a, (value, key) => shallowEqual(value, b[key]));
// }

export interface MirrorGameProps extends RouteComponentProps<GameRouteParams> {
  cellSize: number;
  heightPercent: number;
  padding: number;
  gameClient: GameClient;
  onChangeMode?: (mode: GameControllerMode) => any;
}

export interface MirrorGameState {
  mode?: GameControllerMode;
  grid?: GameGrid;
  nextPill?: PillColors;
  score?: number;
  timeBonus?: number;

  mirrorMode?: GameControllerMode;
  mirrorGrid?: GameGrid;
  mirrorNextPill?: PillColors;
  mirrorScore?: number;
  mirrorTimeBonus?: number;

  highScores?: [string, number][];
  rank?: number;
  pendingMode?: GameControllerMode;

  gameId?: string;
  gameOptions?: Partial<GameOptions> & { level: number; baseSpeed: number };
}

class MirrorGame extends React.Component<MirrorGameProps, MirrorGameState> {
  static defaultProps = {
    cellSize: 32,
    heightPercent: 0.85,
    padding: 15
  };

  state: MirrorGameState = {};

  game?: GameController;
  mirrorGame?: PuppetGameController;
  keyManager?: KeyManager;
  gamepadManager?: GamepadManager;
  touchManager?: SwipeManager;

  componentWillMount() {
    const gameOptions = this.getGameOptions(this.props);
    const { level, baseSpeed } = gameOptions;


    this.props.gameClient.createSingleGame(level, baseSpeed).then((response: CreateSingleGameResponse) => {
      this.setState({
        gameId: response.id,
        gameOptions: response.gameOptions
      });
      console.log('game id:', response.id);
      this._initGame(this.props);
    });
  }
  componentDidMount() {
    // mode means won or lost, no mode = playing
    // if (!this.props.match.params.mode) this._initGame(this.props);
  }
  componentWillUnmount() {
    // this.props.socket.off('singleHighScores', this._highScoreHandler);
    if (this.game && this.game.cleanup) this.game.cleanup();
  }

  componentWillReceiveProps(newProps: MirrorGameProps) {
    const params: GameRouteParams = this.props.match.params;
    const nextParams: GameRouteParams = newProps.match.params;

    const shouldInitGame =
      params.level !== nextParams.level ||
      params.speed !== nextParams.speed ||
      (params.mode !== nextParams.mode && !nextParams.mode);

    if (shouldInitGame) this._initGame(newProps);

    if (!params.mode && this.state.pendingMode) {
      this.setState({ pendingMode: undefined });
    }
  }

  shouldComponentUpdate(newProps: MirrorGameProps, newState: MirrorGameState) {
    const hasChanged =
      !_.every(newState, (value, key) => shallowEqual(value, this.state[key])) ||
      !shallowEqual(newProps, this.props);

    return hasChanged;
  }

  protected getGameOptions = (props: MirrorGameProps) => {
    const { params } = props.match;
    const level = parseInt(params.level) || 0;
    const baseSpeed = parseInt(params.speed) || 15;
    return { level, baseSpeed };
  };

  _initGame = async (props: MirrorGameProps) => {
    if (this.game && this.game.cleanup) this.game.cleanup();

    const { gameId } = this.state;
    const { gameClient } = props;
    const gameOptions = this.state.gameOptions;
    if (!gameOptions || !gameClient || !gameId) return;


    // input managers controlling keyboard and touch events
    this.keyManager = new KeyManager(DEFAULT_KEYS);
    this.touchManager = new SwipeManager();
    // this.gamepadManager = new GamepadManager();

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new GameController({
      hasHistory: true,
      getTime: window.performance.now.bind(window.performance),
      gameOptions,
      onMoveActions: (timedMoveActions: TimedMoveActions) => {
        console.log('send', encodeTimedActions(timedMoveActions));
        gameClient.sendSingleGameMoves(timedMoveActions);
      },
      // inputManagers: [this.keyManager, this.touchManager, this.gamepadManager],
      inputManagers: [this.keyManager, this.touchManager],
      render: (gameControllerState: GameControllerState) => {
        const { gameState } = gameControllerState;
        const { grid, nextPill, score, timeBonus } = gameState;
        if (Math.PI === 1) console.log(encodeGameState(gameState));
        // console.log(encodeGameState(gameState));
        const nextState = {
          mode: gameControllerState.mode,
          grid,
          nextPill,
          score,
          timeBonus
        };
        const {state} = this;
        if(!_.every(nextState, (value, key) => shallowEqual(value, state[key]))) {
          // scoreGameState(gameState);

          this.setState(nextState);
        }
        // this.game.replayHistory();
      },
      onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => {
        console.log("onchangemode", fromMode, toMode);
        gameClient.sendSingleGameModeChange(toMode);
        if (_.includes([GameControllerMode.Lost, GameControllerMode.Won], toMode)) {
          this.setState({ pendingMode: toMode });
          if (toMode === GameControllerMode.Won) this._handleWin();
          if (toMode === GameControllerMode.Lost) this._handleLose();
        }
        if (this.props.onChangeMode) this.props.onChangeMode(toMode);
      }
    });

    this.mirrorGame = new PuppetGameController({
      gameOptions,
      hasHistory: true,
      getTime: window.performance.now.bind(window.performance),
      inputManagers: [],
      render: (gameControllerState: GameControllerState) => {
        const { gameState } = gameControllerState;
        const { grid, nextPill, score, timeBonus } = gameState;

        const nextState = {
          mode: gameControllerState.mode,
          mirrorGrid: grid,
          mirrorNextPill: nextPill,
          mirrorScore: score,
          mirrorTimeBonus: timeBonus
        };
        const {state} = this;
        if(!_.every(nextState, (value, key) => shallowEqual(value, state[key]))) {
          this.setState(nextState);
        }

        // if(this.game) this.game.replayHistory();
        // if(this.game) {
        //   if(encodeGameState(gameState) !== encodeGameState(this.game.getState().gameState)) {
        //     console.log('OUT OF SYNC')
        //   }
        // }
      },
      // onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => {
        // console.log("onchangemode", fromMode, toMode);
      // }
    });

    this.props.gameClient.socket.on("singleGameState", (encodedState) => {
      const gameControllerState = decodeGameControllerState(encodedState);
      console.log('got single game state', gameControllerState);
      if(this.mirrorGame) {
        this.mirrorGame.setState(gameControllerState);
        this.mirrorGame.tick();
      }
    });

    // this.props.gameClient.watchSimpleGameMoves(gameId, (actions: TimedGameActions) => {
    //   console.log("got actions from client", actions);
    //   if (this.mirrorGame) this.mirrorGame.addFrameActions(actions);
    // });

    this.mirrorGame.play();

    // if(this.game) this.game.play();

    setTimeout(() => {
      if (this.game) this.game.play();
    }, 1000);
  };
  protected resetGame = () => {
    this._initGame(this.props);
  };

  _handleWin = () => {
    if (this.state.score !== undefined) {
      const score = this.state.score;
      const level = parseInt(this.props.match.params.level);
      const name = getName();

      if (_.isFinite(level) && _.isFinite(score) && this.props.gameClient.socket.state) {
        this.props.gameClient
          .sendSingleGameHighScore(level, name, score)
          .then((data: SaveScoreResponse) => {
            const scoreResponse = data as SaveScoreResponse;
            const { scores, rank } = scoreResponse;
            console.log("high scores received!", scores, rank);
            this.setState({ highScores: scores, rank: rank });
          })
          .catch((err: Error) => {
            console.error(err);
          });
      }
    }
  };

  _handleLose() {
    if (this.state.score !== undefined) {
      const level = parseInt(this.props.match.params.level);
      const speed = parseInt(this.props.match.params.speed);
      const score = this.state.score;

      this.props.gameClient.sendInfoLostGame(getName(), level, speed, score);
    }
  }

  render() {
    const { grid, nextPill, score, timeBonus, mode /*pendingMode*/ } = this.state;
    const { mirrorGrid, mirrorNextPill, mirrorScore, mirrorTimeBonus, mirrorMode } = this.state;

    if(!grid || !this.game) return 'loading';

    return (
      <div className={styles.mirrorGame}>
        <div className={cx(styles.gameDisplayContainer, styles.left)}>
          <ResponsiveGameDisplay
            grid={grid}
            mode={mode}
            nextPill={nextPill}
            score={score}
            timeBonus={timeBonus}
            gameOptions={this.state.gameOptions}
            onResetGame={this.resetGame}
          />
        </div>
        <div className={cx(styles.gameDisplayContainer, styles.right)}>
          <ResponsiveGameDisplay
            grid={mirrorGrid}
            mode={mirrorMode}
            nextPill={mirrorNextPill}
            score={mirrorScore}
            timeBonus={mirrorTimeBonus}
            gameOptions={this.state.gameOptions}
            onResetGame={this.resetGame}
          />
        </div>
      </div>
    );

    // return (
    //   <div className="game-display-container">
    //     {/*{pendingMode && pendingMode !== params.mode ? (*/}
    //     {/*// if game has been won or lost, redirect to the proper URL*/}
    //     {/*<Redirect push to={`/game/level/${params.level}/speed/${params.speed}/${pendingMode}`} />*/}
    //     {/*) : null}*/}
    //     <ResponsiveGameDisplay
    //       grid={grid}
    //       mode={mode}
    //       nextPill={nextPill}
    //       score={score}
    //       timeBonus={timeBonus}
    //       gameOptions={this.state.gameOptions}
    //       onResetGame={this.resetGame}
    //     />
    //   </div>
    // );
  }
}

export default withRouter(MirrorGame);