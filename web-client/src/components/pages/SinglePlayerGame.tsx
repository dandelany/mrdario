import * as React from "react";
import * as _ from "lodash";
import { RouteComponentProps, withRouter } from "react-router-dom";
import shallowEqual from "@/utils/shallowEqual";

import { DEFAULT_KEYS } from "mrdario-core/game/controller/constants";
import { GameControllerMode, GameControllerState } from "mrdario-core/game/controller";
import { GameGrid, PillColors } from "mrdario-core/game/types";

import { encodeGameState } from "mrdario-core/api/game/encoding";
import { GameClient } from "mrdario-core/client/GameClient";
// import { LocalWebGameController } from "mrdario-core/game/controller/web";

import { GameOptions } from "mrdario-core";
import { getGetTime } from "mrdario-core/utils/time";
import { GameController } from "mrdario-core/game/controller/GameController";
import { GamepadManager, KeyManager, SwipeManager } from "mrdario-core/game/input/web";
import { SaveScoreResponse } from "mrdario-core/api/scores";

import { GameRouteParams } from "@/types";
import responsiveGame from "@/components/responsiveGame";
import { ResponsiveGameDisplay } from "@/components/game/GameDisplay";


function getName() {
  return window.localStorage ? window.localStorage.getItem("mrdario-name") || "Anonymous" : "Anonymous";
}

export interface SinglePlayerGameProps extends RouteComponentProps<GameRouteParams> {
  cellSize: number;
  heightPercent: number;
  padding: number;
  gameClient: GameClient;
  onChangeMode?: (mode: GameControllerMode) => any;
}

export interface SinglePlayerGameState {
  mode?: GameControllerMode;
  grid?: GameGrid;
  nextPill?: PillColors;
  score?: number;
  timeBonus?: number;

  highScores?: [string, number][];
  rank?: number;
  pendingMode?: GameControllerMode;
  gameOptions?: Partial<GameOptions> & { level: number; baseSpeed: number };
}

class SinglePlayerGame extends React.Component<SinglePlayerGameProps, SinglePlayerGameState> {
  static defaultProps = {
    cellSize: 32,
    heightPercent: 0.85,
    padding: 15
  };

  state: SinglePlayerGameState = {};

  game?: any;
  keyManager?: KeyManager;
  gamepadManager?: GamepadManager;
  touchManager?: SwipeManager;

  componentDidMount() {
    // mode means won or lost, no mode = playing
    if (!this.props.match.params.mode) this._initGame(this.props);
  }
  componentWillUnmount() {
    // this.props.socket.off('singleHighScores', this._highScoreHandler);
    if (this.game && this.game.cleanup) this.game.cleanup();
  }

  componentDidUpdate(prevProps: SinglePlayerGameProps) {
    const params: GameRouteParams = prevProps.match.params;
    const nextParams: GameRouteParams = this.props.match.params;

    const shouldInitGame =
      params.level !== nextParams.level ||
      params.speed !== nextParams.speed ||
      (params.mode !== nextParams.mode && !nextParams.mode);

    if (shouldInitGame) this._initGame(this.props);

    if (!params.mode && this.state.pendingMode) {
      this.setState({ pendingMode: undefined });
    }
  }

  shouldComponentUpdate(newProps: SinglePlayerGameProps, newState: SinglePlayerGameState) {
    const hasChanged =
      (Object.keys(newState) as Array<keyof SinglePlayerGameState>).some(key => !shallowEqual(newState[key], this.state[key])) ||
      !shallowEqual(newProps, this.props);

    return hasChanged;
  }

  protected getGameOptions = (props: SinglePlayerGameProps) => {
    const { params } = props.match;
    const level = parseInt(params.level) || 0;
    const baseSpeed = parseInt(params.speed) || 15;
    return { level, baseSpeed };
  };

  _initGame = (props: SinglePlayerGameProps) => {
    if (this.game && this.game.cleanup) this.game.cleanup();

    const gameOptions = this.getGameOptions(props);
    this.setState({ gameOptions });
    const { level, baseSpeed } = gameOptions;

    // input managers controlling keyboard and touch events
    this.keyManager = new KeyManager(DEFAULT_KEYS);
    this.touchManager = new SwipeManager();
    // this.gamepadManager = new GamepadManager();

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new GameController({
      hasHistory: false,
      getTime: getGetTime(),
      gameOptions: {
        level,
        baseSpeed
        // initialSeed: "help"
      },
      // inputManagers: [this.keyManager, this.touchManager, this.gamepadManager],
      inputManagers: [this.keyManager, this.touchManager],
      render: (gameControllerState: GameControllerState) => {
        const { gameState } = gameControllerState;
        const { grid, nextPill, score, timeBonus } = gameState;
        if (Math.PI === 1) console.log(encodeGameState(gameState));
        // console.log(encodeGameState(gameState));
        this.setState({
          mode: gameControllerState.mode,
          grid,
          nextPill,
          score,
          timeBonus
        });
        // this.game.replayHistory();
      },
      onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => {
        console.log("onchangemode", fromMode, toMode);
        if (_.includes([GameControllerMode.Lost, GameControllerMode.Won], toMode)) {
          this.setState({ pendingMode: toMode });
          if (toMode === GameControllerMode.Won) this._handleWin(this.game?.getState().gameState.score);
          if (toMode === GameControllerMode.Lost) this._handleLose();
        }
        if (this.props.onChangeMode) this.props.onChangeMode(toMode);
      }
    });
    this.game.play();
    // this.game.startCountdown(0);
  };
  protected resetGame = () => {
    this._initGame(this.props);
  };

  _handleWin = (finalScore = this.state.score) => {
    if (finalScore !== undefined) {
      const score = finalScore;
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
    // local single-player currently does not need to notify the server on loss.
  }

  render() {
    const { grid, nextPill, score, timeBonus, mode /*pendingMode*/ } = this.state;

    return (
      <div className="game-display-container">
        {/*{pendingMode && pendingMode !== params.mode ? (*/}
        {/*// if game has been won or lost, redirect to the proper URL*/}
        {/*<Redirect push to={`/game/level/${params.level}/speed/${params.speed}/${pendingMode}`} />*/}
        {/*) : null}*/}
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
    );
  }
}

export default withRouter(responsiveGame(SinglePlayerGame));
