import * as React from "react";
import * as _ from "lodash";
import { RouteComponentProps, withRouter } from "react-router-dom";

import shallowEqual from "@/utils/shallowEqual";
import { GameControllerMode, GameControllerState } from "mrdario-core/lib/game/controller";
import { GameGrid, PillColors } from "mrdario-core/lib/game/types";

import { decodeGameControllerState } from "mrdario-core/lib/api/game/encoding";
import { GameClient } from "mrdario-core/lib/client/GameClient";
import { CreateSingleGameResponse } from "mrdario-core/lib/api/game";

import { ResponsiveGameDisplay } from "@/components/game/GameDisplay";
import { GameOptions } from "mrdario-core";
import { PuppetGameController } from "mrdario-core/src/game/controller/PuppetGameController";

const styles = require("./MirrorGame.module.scss");

// function getName() {
//   return window.localStorage ? window.localStorage.getItem("mrdario-name") || "Anonymous" : "Anonymous";
// }

// function shallowishEqual<T extends ArrayLike<unknown>>(a: T, b: T):boolean {
//   return _.every(a, (value, key) => shallowEqual(value, b[key]));
// }

interface SingleRemoteGameRouteParams {
  gameId: string;
}

export interface SingleRemoteGameProps extends RouteComponentProps<SingleRemoteGameRouteParams> {
  gameClient: GameClient;
  onChangeMode?: (mode: GameControllerMode) => any;
}

export interface SingleRemoteGameState {
  gameOptions?: Partial<GameOptions> & { level: number; baseSpeed: number };

  mode?: GameControllerMode;
  grid?: GameGrid;
  nextPill?: PillColors;
  score?: number;
  timeBonus?: number;

  highScores?: [string, number][];
  rank?: number;
  pendingMode?: GameControllerMode;
}

class SingleRemoteGame extends React.Component<SingleRemoteGameProps, SingleRemoteGameState> {
  state: SingleRemoteGameState = {};
  game?: PuppetGameController;

  componentWillMount() {
    const { gameClient, match } = this.props;
    const { gameId } = match.params;

    gameClient.socket.emit("GetSingleGameInfo", gameId, (_err: any, response: CreateSingleGameResponse) => {
      console.log("got", response);
      this.setState({
        gameOptions: response.gameOptions
      });
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

  // componentWillReceiveProps(newProps: SingleRemoteGameProps) {
  //   const params: SingleRemoteGameRouteParams = this.props.match.params;
  //   const nextParams: SingleRemoteGameRouteParams = newProps.match.params;
  //
  //   const shouldInitGame = params.gameId !== nextParams.gameId;
  //
  //   if (shouldInitGame) {
  //     this.props.gameClient.socket.emit("GetSingleGameInfo", (response: CreateSingleGameResponse) => {
  //       console.log("got", response);
  //       this.setState({
  //         gameOptions: response.gameOptions
  //       });
  //       this._initGame(this.props);
  //     });
  //   }
  // }

  shouldComponentUpdate(newProps: SingleRemoteGameProps, newState: SingleRemoteGameState) {
    const hasChanged =
      !_.every(newState, (value, key) => shallowEqual(value, this.state[key])) ||
      !shallowEqual(newProps, this.props);

    return hasChanged;
  }

  _initGame = async (props: SingleRemoteGameProps) => {
    if (this.game && this.game.cleanup) this.game.cleanup();

    const { gameId } = props.match.params;
    const { gameClient } = props;
    const gameOptions = this.state.gameOptions;
    if (!gameOptions || !gameClient || !gameId) return;

    // this.gamepadManager = new GamepadManager();

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new PuppetGameController({
      gameOptions,
      hasHistory: true,
      getTime: window.performance.now.bind(window.performance),
      inputManagers: [],
      render: (gameControllerState: GameControllerState) => {
        const { gameState } = gameControllerState;
        const { grid, nextPill, score, timeBonus } = gameState;
        console.log('called render');

        const nextState: SingleRemoteGameState = {
          mode: gameControllerState.mode,
          grid: grid,
          nextPill: nextPill,
          score: score,
          timeBonus: timeBonus
        };
        const { state } = this;
        if (!_.every(nextState, (value, key) => shallowEqual(value, state[key]))) {
          this.setState(nextState);
        }

        // if(this.game) this.game.replayHistory();
        // if(this.game) {
        //   if(encodeGameState(gameState) !== encodeGameState(this.game.getState().gameState)) {
        //     console.log('OUT OF SYNC')
        //   }
        // }
      }
      // onChangeMode: (fromMode: GameControllerMode, toMode: GameControllerMode) => {
      // console.log("onchangemode", fromMode, toMode);
      // }
    });
    const gameChannel = props.gameClient.socket.subscribe(`game-${gameId}`);
    gameChannel.watch((data: string) => {
      const state = decodeGameControllerState(data);
      console.log('got state', state);
      if(this.game) {
        this.game.setState(state);
        this.game.tick();
      }
      else console.error('no game');
    });

    // this.props.gameClient.socket.on("singleGameState", encodedState => {
    //   const gameControllerState = decodeGameControllerState(encodedState);
    //   console.log("got single game state", gameControllerState);
    //   if (this.game) {
    //     this.game.setState(gameControllerState);
    //     this.game.tick();
    //   }
    // });

    this.game.play();

    // if(this.game) this.game.play();

    // setTimeout(() => {
    //   if (this.game) this.game.play();
    // }, 1000);
  };
  protected resetGame = () => {
    this._initGame(this.props);
  };

  // _handleWin = () => {
  //   if (this.state.score !== undefined) {
  //     const score = this.state.score;
  //     const level = parseInt(this.props.match.params.level);
  //     const name = getName();
  //
  //     if (_.isFinite(level) && _.isFinite(score) && this.props.gameClient.socket.state) {
  //       this.props.gameClient
  //         .sendSingleGameHighScore(level, name, score)
  //         .then((data: SaveScoreResponse) => {
  //           const scoreResponse = data as SaveScoreResponse;
  //           const { scores, rank } = scoreResponse;
  //           console.log("high scores received!", scores, rank);
  //           this.setState({ highScores: scores, rank: rank });
  //         })
  //         .catch((err: Error) => {
  //           console.error(err);
  //         });
  //     }
  //   }
  // };
  //
  // _handleLose() {
  //   if (this.state.score !== undefined) {
  //     const level = parseInt(this.props.match.params.level);
  //     const speed = parseInt(this.props.match.params.speed);
  //     const score = this.state.score;
  //
  //     this.props.gameClient.sendInfoLostGame(getName(), level, speed, score);
  //   }
  // }

  render() {
    const { grid, nextPill, score, timeBonus, mode /*pendingMode*/ } = this.state;

    if (!grid || !this.game) return "loading";

    return (
      <div className={styles.mirrorGame}>
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

export default withRouter(SingleRemoteGame);
