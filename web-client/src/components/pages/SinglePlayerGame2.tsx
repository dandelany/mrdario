import * as React from "react";
import * as _ from "lodash";
import { RouteComponentProps, withRouter } from "react-router-dom";
import shallowEqual from "@/utils/shallowEqual";

import { DEFAULT_KEYS } from "mrdario-core/lib/game/controller/constants";
import { GameControllerMode, GameControllerState } from "mrdario-core/lib/game/controller";
import { GameGrid, PillColors } from "mrdario-core/lib/game/types";

import { encodeGameState } from "mrdario-core/lib/api/game/encoding";
import { GameClient } from "mrdario-core/lib/client/GameClient";

import { GameOptions } from "mrdario-core";
import { getGetTime } from "mrdario-core/lib/utils/time";
import { GameController } from "mrdario-core/lib/game/controller/GameController";
import { GamepadManager, KeyManager, SwipeManager } from "mrdario-core/lib/game/input/web";
import { SaveScoreResponse } from "mrdario-core/lib/api/scores";

import { GameRouteParams } from "@/types";
import responsiveGame from "@/components/responsiveGame";
import { ResponsiveGameDisplay } from "@/components/game/GameDisplay";
import { CreateSingleGameResponse, encodeTimedActions } from "mrdario-core/lib/api";


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

  gameId?: string;
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

  componentWillReceiveProps(newProps: SinglePlayerGameProps) {
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

  shouldComponentUpdate(newProps: SinglePlayerGameProps, newState: SinglePlayerGameState) {
    const hasChanged =
      !_.every(newState, (value, key) => shallowEqual(value, this.state[key])) ||
      !shallowEqual(newProps, this.props);

    return hasChanged;
  }

  componentDidUpdate() {
    const { grid, gameId } = this.state;
    if (grid && gameId) {
      // console.log('send', this.state.gameId, this.state.grid);
      this.props.gameClient.publishSimpleGameState(gameId, grid);
    }
  }

  protected getGameOptions = (props: SinglePlayerGameProps) => {
    const { params } = props.match;
    const level = parseInt(params.level) || 0;
    const baseSpeed = parseInt(params.speed) || 15;
    return { level, baseSpeed };
  };

  _initGame = async (props: SinglePlayerGameProps) => {
    if (this.game && this.game.cleanup) this.game.cleanup();

    const { gameClient } = props;
    const gameOptions = this.getGameOptions(props);
    this.setState({ gameOptions });
    const { level, baseSpeed } = gameOptions;

    let gameResponse: CreateSingleGameResponse;
    try {
      gameResponse = await gameClient.createSingleGame(level, baseSpeed);
    } catch(e) {
      // todo handle
      console.error(e);
      throw e;
    }
    // const gameId = gameResponse.id;

    // input managers controlling keyboard and touch events
    this.keyManager = new KeyManager(DEFAULT_KEYS);
    this.touchManager = new SwipeManager();
    // this.gamepadManager = new GamepadManager();

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new GameController({
      hasHistory: false,
      getTime: getGetTime(),
      gameOptions: gameResponse.gameOptions,
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
      onMoveActions: (timedMoveActions) => {
        console.log('send', encodeTimedActions(timedMoveActions));
        gameClient.sendSingleGameMoves(timedMoveActions);
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
    this.game.play();
    // this.game.startCountdown(0);
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

    if(!grid || !this.game) return 'loading';

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
