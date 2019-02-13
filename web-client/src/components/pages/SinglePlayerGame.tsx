import * as React from "react";
import * as _ from "lodash";
import { withRouter, Redirect, RouteComponentProps } from "react-router-dom";
import shallowEqual from "@/utils/shallowEqual";

import { DEFAULT_KEYS } from "mrdario-core/lib/game/controller/constants";
import { GameControllerMode, GameControllerState } from "mrdario-core/lib/game/controller/types";
import { GameGrid, PillColors } from "mrdario-core/lib/game/types";

import { encodeGameState } from "mrdario-core/lib/encoding/game";
import { GameClient } from "mrdario-core/lib/api/client/GameClient";
import { LocalWebGameController } from "mrdario-core/lib/game/controller/web";
import { KeyManager, GamepadManager, SwipeManager } from "mrdario-core/lib/game/input/web";
import { LobbyResponse, GameScoreResponse } from "mrdario-core/lib/api/types";

import { GameRouteParams } from "@/types";

// import Playfield from "@/components/game/Playfield";
import Playfield from "@/components/game/PlayfieldPixi";
import PillPreviewPanel from "@/components/game/PillPreviewPanel";
import WonOverlay from "@/components/overlays/WonOverlay";
import LostOverlay from "@/components/overlays/LostOverlay";
import responsiveGame from "@/components/responsiveGame";
import { ExplosionField } from "@/components/game/ExplosionField";

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

  _initGame(props: SinglePlayerGameProps) {
    if (this.game && this.game.cleanup) this.game.cleanup();

    const { gameClient } = props;
    const { params } = props.match;
    const level = parseInt(params.level) || 0;
    const speed = parseInt(params.speed) || 15;

    //
    // window.setInterval(() => {
    //   gameClient.ping()
    //     .then((delay: number) => {
    //       console.log('delay:', delay);
    //     });
    // }, 1000);

    gameClient.sendInfoStartGame(getName(), level, speed);

    gameClient
      .joinLobby()
      .then((data: LobbyResponse) => {
        console.log("OK", data);
      })
      .catch((err: Error) => {
        console.error(err);
      });

    gameClient.createSimpleGame(level, speed).then((gameId: string) => {
      this.setState({ gameId });
    });

    // input managers controlling keyboard and touch events
    this.keyManager = new KeyManager(DEFAULT_KEYS);
    this.touchManager = new SwipeManager();
    // this.gamepadManager = new GamepadManager();

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new LocalWebGameController({
      level,
      speed,
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
      },
      onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => {
        console.log("onchangemode", fromMode, toMode);
        if (_.includes([GameControllerMode.Lost, GameControllerMode.Won], toMode)) {
          this.setState({ pendingMode: toMode });
          if (toMode === GameControllerMode.Won) this._handleWin();
          if (toMode === GameControllerMode.Lost) this._handleLose();
        }
        if (this.props.onChangeMode) this.props.onChangeMode(toMode);
      }
    });
    this.game.play();
  }

  _handleWin = () => {
    if (this.state.score !== undefined) {
      const score = this.state.score;
      const level = parseInt(this.props.match.params.level);
      const name = getName();

      if (_.isFinite(level) && _.isFinite(score) && this.props.gameClient.socket.state) {
        console.log("sending score");

        this.props.gameClient
          .sendSingleGameHighScore(level, name, score)
          .then((data: GameScoreResponse) => {
            const scoreResponse = data as GameScoreResponse;
            const { scores, rank } = scoreResponse;
            console.log("high scores received!", scores, rank);
            this.setState({ highScores: scores, rank: rank });
          })
          .catch((err: Error) => {
            console.error(err);
          });
      }
    }
  }

  _handleLose() {
    if (this.state.score !== undefined) {
      const level = parseInt(this.props.match.params.level);
      const speed = parseInt(this.props.match.params.speed);
      const score = this.state.score;

      this.props.gameClient.sendInfoLostGame(getName(), level, speed, score);
    }
  }

  render() {
    const { grid, nextPill, highScores, rank, pendingMode, score, timeBonus } = this.state;

    // if(this.game) console.log(encodeGameState(this.game.getState().gameState));

    // if(!hasGrid) return <div>loading</div>;

    const { cellSize, padding: paddingProp } = this.props;
    const { params } = this.props.match;

    // pass fractional padding to set padding to a fraction of cell size
    const padding: number = paddingProp > 0 && paddingProp < 1 ? paddingProp * cellSize : paddingProp;
    const numRows: number = grid ? grid.length : 17;
    const numCols: number = grid ? grid[0].length : 8;
    const width: number = numCols * cellSize + padding * 2;
    // make shorter by one row to account for special unplayable top row
    const height: number = (numRows - 1) * cellSize + padding * 2;
    const style = { position: "relative" as "relative", width, height, padding };
    const overlayStyle = { position: "absolute" as "absolute", width, height, padding, left: 0 };
    const lostOverlayStyle = { ...overlayStyle, top: params.mode === GameControllerMode.Lost ? 0 : height };
    const wonOverlayStyle = { ...overlayStyle, top: params.mode === GameControllerMode.Won ? 0 : height };

    return (
      <div className="game-playfield-container">
        {pendingMode && pendingMode !== params.mode ? (
          // if game has been won or lost, redirect to the proper URL
          <Redirect push to={`/game/level/${params.level}/speed/${params.speed}/${pendingMode}`} />
        ) : null}
        <div style={style} {...{ className: "game-playfield" }}>
          <WonOverlay
            score={score}
            timeBonus={timeBonus}
            highScores={highScores}
            rank={rank}
            params={params}
            style={wonOverlayStyle}
          />
          <LostOverlay params={params} style={lostOverlayStyle} />
          {grid ? <Playfield grid={grid} cellSize={cellSize} /> : ""}
          {grid ? <ExplosionField grid={grid} cellSize={cellSize} /> : null}
        </div>

        {score !== undefined ? (
          <div className="score-panel">
            <h5>SCORE</h5>
            {score}
          </div>
        ) : null}

        {nextPill ? <PillPreviewPanel {...{ cellSize, pill: nextPill }} /> : null}
      </div>
    );
  }
}

export default withRouter(responsiveGame(SinglePlayerGame));
