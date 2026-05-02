import { GameActionType } from "../types/gameAction.js";
import { GameColor, GameMode, InputEventType } from "../types/index.js";
import { GameInput } from "../enums.js";
import { MultiGameRunner, MultiGameRunnerMode } from "./MultiGameRunner.js";
import { decodeGrid } from "../../api/game/encoding/index.js";
import { MultiGame } from "../MultiGame.js";
import { GameState } from "../types/types.js";

const mockSeed = "runner-seed";

function getComboState(baseState: GameState): GameState {
  return {
    ...baseState,
    mode: GameMode.Cascade,
    frame: 10,
    modeTicks: 0,
    lineColors: [GameColor.Color1, GameColor.Color2],
    grid: decodeGrid(`gh,8:
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXFX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
    `),
  };
}

describe("MultiGameRunner", () => {
  test("starts a MultiGame and ticks it forward", () => {
    const runner = new MultiGameRunner({
      players: 2,
      seed: mockSeed,
      gameOptions: [{ level: 0 }, { level: 1 }],
    });

    expect(runner.getState()).toMatchObject({
      mode: MultiGameRunnerMode.Setup,
      frame: 0,
      playersReady: [false, false],
      multiGame: undefined,
    });

    runner.start();
    expect(runner.getState()).toMatchObject({
      mode: MultiGameRunnerMode.Playing,
      frame: 0,
      playersReady: [true, true],
      multiGame: {
        frame: 0,
        gameStates: [{ mode: GameMode.Ready }, { mode: GameMode.Ready }],
      },
    });

    runner.tick();
    expect(runner.getState()).toMatchObject({
      frame: 1,
      multiGame: {
        frame: 1,
        gameStates: [{ mode: GameMode.Playing }, { mode: GameMode.Playing }],
      },
    });
  });

  test("starts only when all players are ready", () => {
    const runner = new MultiGameRunner({ players: 2, seed: mockSeed });

    runner.setPlayerReady(0, true);
    expect(runner.startIfReady()).toBe(false);
    expect(runner.getState().mode).toBe(MultiGameRunnerMode.Setup);

    runner.setPlayerReady(1, true);
    expect(runner.startIfReady()).toBe(true);
    expect(runner.getState().mode).toBe(MultiGameRunnerMode.Playing);
  });

  test("applies queued player actions on their target frame", () => {
    const runner = new MultiGameRunner({ players: 2, seed: mockSeed });
    runner.start();

    runner.addPlayerActions(1, {
      frame: 1,
      actions: [{ type: GameActionType.Garbage, colors: [GameColor.Color1, GameColor.Color2] }],
    });
    runner.tick();

    expect(runner.getState().multiGame?.gameStates[0].garbage).toEqual([]);
    expect(runner.getState().multiGame?.gameStates[1].garbage).toEqual([GameColor.Color1, GameColor.Color2]);
  });

  test("delivers combo garbage through the runner on the next tick", () => {
    const runner = new MultiGameRunner({
      players: 2,
      seed: mockSeed,
      multiGameFactory: (options) => {
        const multiGame = new MultiGame(options);
        const state = multiGame.getState();
        multiGame.setState({
          frame: 10,
          gameStates: [
            getComboState(state.gameStates[0]),
            { ...state.gameStates[1], frame: 10, mode: GameMode.Playing },
          ],
        });
        return multiGame;
      },
    });
    runner.start();

    const comboTickResult = runner.tick();
    expect(comboTickResult?.gameResults[0]).toEqual({
      type: "Combo",
      colors: [GameColor.Color1, GameColor.Color2],
    });

    runner.tick();
    expect(runner.getState().multiGame?.gameStates[1].garbage).toEqual([GameColor.Color1, GameColor.Color2]);
  });

  test("does not tick while paused but can queue actions for resume", () => {
    const runner = new MultiGameRunner({ players: 2, seed: mockSeed });
    runner.start();
    runner.pause();

    runner.addPlayerActions(0, {
      frame: 1,
      actions: [{ type: GameActionType.Move, input: GameInput.Left, eventType: InputEventType.KeyDown }],
    });
    expect(runner.tick()).toBeUndefined();
    expect(runner.getState().frame).toBe(0);

    runner.resume();
    runner.tick();
    expect(runner.getState().frame).toBe(1);
  });

  test("enters ended mode when MultiGame returns a terminal result", () => {
    const runner = new MultiGameRunner({ players: 2, seed: mockSeed });
    runner.start();
    runner.tick();

    runner.addPlayerActions(0, {
      frame: 2,
      actions: [{ type: GameActionType.ForfeitWin }],
    });
    runner.addPlayerActions(1, {
      frame: 3,
      actions: [{ type: GameActionType.Garbage, colors: [GameColor.Color3] }],
    });

    const tickResult = runner.tick();
    const endedState = runner.getState();

    expect(tickResult?.result).toEqual({ type: "Win", player: 0 });
    expect(endedState.mode).toBe(MultiGameRunnerMode.Ended);
    expect(endedState.multiGame?.result).toEqual({ type: "Win", player: 0 });
    expect(runner.tick()).toBeUndefined();
    expect(runner.getState()).toEqual(endedState);
  });

  test("rejects late actions until rollback is implemented", () => {
    const runner = new MultiGameRunner({ players: 2, seed: mockSeed });
    runner.start();
    runner.tick();

    expect(() =>
      runner.addPlayerActions(0, {
        frame: 1,
        actions: [{ type: GameActionType.ForfeitWin }],
      })
    ).toThrow("late actions require rollback");
  });
});
