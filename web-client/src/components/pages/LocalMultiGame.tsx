import * as React from "react";
import cx from "classnames";
import { Link, RouteComponentProps, withRouter } from "react-router-dom";

import { GameOptions, GameInput, InputEventType, MultiGameResultType } from "mrdario-core/game";
import { GameActionType } from "mrdario-core/game/types";
import { GameControllerMode } from "mrdario-core/game/controller";
import { KeyManager } from "mrdario-core/game/input/web";
import { KeyBindings } from "mrdario-core/game/input/types";
import { isMoveInput } from "mrdario-core/game/utils";
import { MultiGameRunner, MultiGameRunnerMode, MultiGameRunnerState } from "mrdario-core/game/runner";

import { GameRouteParams } from "@/types";
import { ResponsiveGameDisplay } from "@/components/game/GameDisplay";

declare const require: (path: string) => Record<string, string>;

const styles = require("./LocalMultiGame.module.scss");

const frameMs = 1000 / 60;

const playerOneKeys: KeyBindings = {
  [GameControllerMode.Playing]: {
    [GameInput.Left]: "left",
    [GameInput.Right]: "right",
    [GameInput.Up]: "up",
    [GameInput.Down]: "down",
    [GameInput.RotateCCW]: "z",
    [GameInput.RotateCW]: "x",
  },
};

const playerTwoKeys: KeyBindings = {
  [GameControllerMode.Playing]: {
    [GameInput.Left]: "a",
    [GameInput.Right]: "d",
    [GameInput.Up]: "w",
    [GameInput.Down]: "s",
    [GameInput.RotateCCW]: "q",
    [GameInput.RotateCW]: "e",
  },
};

interface LocalMultiGameState {
  runnerState?: MultiGameRunnerState;
  gameOptions?: Partial<GameOptions> & { level: number; baseSpeed: number };
}

class LocalMultiGame extends React.Component<RouteComponentProps<GameRouteParams>, LocalMultiGameState> {
  state: LocalMultiGameState = {};

  protected runner?: MultiGameRunner;
  protected keyManagers: KeyManager[] = [];
  protected cleanupObserver?: () => void;
  protected timer?: ReturnType<typeof window.setInterval>;

  componentDidMount() {
    // start a fresh local multiplayer runner for this route
    this.initGame();
  }

  componentDidUpdate(prevProps: RouteComponentProps<GameRouteParams>) {
    // route params are the dev-mode settings for both players
    const params = prevProps.match.params;
    const nextParams = this.props.match.params;
    if (params.level !== nextParams.level || params.speed !== nextParams.speed) {
      this.initGame();
    }
  }

  componentWillUnmount() {
    // stop timers and detach keyboard bindings
    this.cleanupGame();
  }

  protected getGameOptions = (): Partial<GameOptions> & { level: number; baseSpeed: number } => {
    // parse route settings into Game options
    const { params } = this.props.match;
    const level = parseInt(params.level) || 0;
    const baseSpeed = parseInt(params.speed) || 15;
    return { level, baseSpeed };
  };

  protected initGame = () => {
    // create runner, bind two keyboards, and start the local clock
    this.cleanupGame();
    const gameOptions = this.getGameOptions();
    const runner = new MultiGameRunner({
      players: 2,
      seed: `local-multi-${Date.now()}`,
      gameOptions: [gameOptions, gameOptions],
    });

    this.runner = runner;
    this.cleanupObserver = runner.observe({
      onState: (runnerState) => this.setState({ runnerState }),
      onTick: this.logTickResult,
    });
    runner.start();

    this.keyManagers = [new KeyManager(playerOneKeys), new KeyManager(playerTwoKeys)];
    for (let player = 0; player < this.keyManagers.length; player++) {
      const keyManager = this.keyManagers[player];
      keyManager.setMode(GameControllerMode.Playing);
      keyManager.on("input", (input: GameInput, eventType: InputEventType) => {
        this.handleInput(player, input, eventType);
      });
    }

    this.timer = window.setInterval(() => this.runner?.tick(), frameMs);
    this.setState({ gameOptions, runnerState: runner.getState() });
  };

  protected cleanupGame = () => {
    // cleanup all browser resources owned by this page
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
    if (this.cleanupObserver) {
      this.cleanupObserver();
      this.cleanupObserver = undefined;
    }
    for (const keyManager of this.keyManagers) {
      keyManager.unbindModeKeys(GameControllerMode.Playing);
      keyManager.removeAllListeners();
    }
    this.keyManagers = [];
    this.runner = undefined;
  };

  protected handleInput = (player: number, input: GameInput, eventType: InputEventType) => {
    // publish a player move for the next local runner frame
    const runner = this.runner;
    if (!runner || !isMoveInput(input)) return;
    const runnerState = runner.getState();
    if (runnerState.mode !== MultiGameRunnerMode.Playing) return;

    runner.addPlayerActions(player, {
      frame: runnerState.frame + 1,
      actions: [{ type: GameActionType.Move, input, eventType }],
    });
  };

  protected logTickResult = (tickResult: ReturnType<MultiGameRunner["tick"]>) => {
    // dev-only breadcrumb for combo/garbage debugging
    if (!tickResult) return;
    if (!tickResult.result && !tickResult.gameResults.some(Boolean)) return;
    console.log("[local-multi] tick result", {
      frame: this.runner?.getState().frame,
      gameResults: tickResult.gameResults,
      result: tickResult.result,
      garbage: this.runner?.getState().multiGame?.gameStates.map((gameState) => gameState.garbage),
    });
  };

  protected getPlayerDisplayMode = (player: number): GameControllerMode | undefined => {
    // map match-level result onto per-board display overlays
    const result = this.state.runnerState?.multiGame?.result;
    if (!result) return undefined;

    if (result.type === MultiGameResultType.Win) {
      return result.player === player ? GameControllerMode.Won : GameControllerMode.Lost;
    }
    if (result.type === MultiGameResultType.Lose) {
      return result.player === player ? GameControllerMode.Lost : GameControllerMode.Won;
    }
    return GameControllerMode.Lost;
  };

  render() {
    const { runnerState, gameOptions } = this.state;
    const gameStates = runnerState?.multiGame?.gameStates || [];

    return (
      <div className={styles.localMultiGame}>
        <div className={styles.toolbar}>
          <Link to="/dev">
            <span className="btn-white">dev</span>
          </Link>
          <span className="btn-white" onClick={this.initGame}>
            reset
          </span>
          <span className={styles.status}>{runnerState?.mode || "loading"}</span>
        </div>

        <div className={cx(styles.gameDisplayContainer, styles.playerOne)}>
          <ResponsiveGameDisplay
            grid={gameStates[0]?.grid}
            mode={this.getPlayerDisplayMode(0)}
            nextPill={gameStates[0]?.nextPill}
            score={gameStates[0]?.score}
            timeBonus={gameStates[0]?.timeBonus}
            gameOptions={gameOptions}
            onResetGame={this.initGame}
          />
        </div>

        <div className={cx(styles.gameDisplayContainer, styles.playerTwo)}>
          <ResponsiveGameDisplay
            grid={gameStates[1]?.grid}
            mode={this.getPlayerDisplayMode(1)}
            nextPill={gameStates[1]?.nextPill}
            score={gameStates[1]?.score}
            timeBonus={gameStates[1]?.timeBonus}
            gameOptions={gameOptions}
            onResetGame={this.initGame}
          />
        </div>
      </div>
    );
  }
}

export default withRouter(LocalMultiGame);
