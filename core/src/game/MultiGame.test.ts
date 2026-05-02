import { decodeGrid } from "../api/game/encoding/index.js";
import {
  GameColor,
  GameActionType,
  GameMode,
  GameOptions,
  GameState,
  GameTickResultType,
  GridObjectType,
  MultiGame,
  MultiGameResultType,
  MultiGameState,
} from "./index.js";

const mockSeed = "test-seed";

function getMultiGameOptions(): Partial<GameOptions>[] {
  return [
    { level: 0, baseSpeed: 15 },
    { level: 3, baseSpeed: 12 },
    { level: 5, baseSpeed: 10 },
  ];
}

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

function getWinState(baseState: GameState): GameState {
  return {
    ...baseState,
    mode: GameMode.Reconcile,
    frame: 20,
    modeTicks: 0,
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
      XXXXXDRX
      XXXXLBXX
      XXXXXFXX
      XXXXXFXX
      XXXXXXXX
      XXXXXXXX
      XXXXXXXX
    `),
  };
}

function getLoseState(baseState: GameState): GameState {
  return {
    ...baseState,
    mode: GameMode.Playing,
    frame: 30,
    pill: undefined,
    modeTicks: 0,
    grid: decodeGrid(`gh,8:
      XXXXXXXX
      XXXXDBXX
      XXXLRXXX
      XXXDBXXX
      XXXLRXXX
      XXXDBXXX
      XXXLRXXX
      XXXDBXXX
      XXXLRXXX
      XXXDBXXX
      XXXLRXXX
      XVFVXFVX
      XXXXXXXX
      XXXNNXXX
      VXXXXXXV
      XVXXXXVX
      XXFFFFXX
    `),
  };
}

describe("MultiGame", () => {
  test("constructs and ticks multiple games in lockstep", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });

    expect(multiGame.getState()).toMatchObject({
      frame: 0,
      gameStates: [
        { frame: 0, mode: GameMode.Ready },
        { frame: 0, mode: GameMode.Ready },
      ],
    });

    const results = multiGame.tick();

    expect(results).toEqual({ gameResults: [undefined, undefined] });
    expect(multiGame.getState()).toMatchObject({
      frame: 1,
      gameStates: [
        { frame: 1, mode: GameMode.Playing },
        { frame: 1, mode: GameMode.Playing },
      ],
    });
  });

  test("when one player gets combo, queues garbage for every other player on the next tick", () => {
    const multiGame = new MultiGame({
      players: 3,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const state: MultiGameState = multiGame.getState();
    multiGame.setState({
      frame: 10,
      gameStates: [
        getComboState(state.gameStates[0]),
        { ...state.gameStates[1], frame: 10 },
        { ...state.gameStates[2], frame: 10 },
      ],
    });

    const comboTickResult = multiGame.tick();
    expect(comboTickResult).toEqual({
      gameResults: [
        { type: GameTickResultType.Combo, colors: [GameColor.Color1, GameColor.Color2] },
        undefined,
        undefined,
      ],
    });

    multiGame.tick();
    const nextState = multiGame.getState();

    expect(nextState.gameStates[0].garbage).toEqual([]);
    expect(nextState.gameStates[1].garbage).toEqual([GameColor.Color1, GameColor.Color2]);
    expect(nextState.gameStates[2].garbage).toEqual([GameColor.Color1, GameColor.Color2]);

    multiGame.tick();
    const laterState = multiGame.getState();
    expect(laterState.gameStates[1].garbage).toEqual([GameColor.Color1, GameColor.Color2]);
    expect(laterState.gameStates[2].garbage).toEqual([GameColor.Color1, GameColor.Color2]);
  });

  test("garbage action lands on the target grid during reconcile", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const state: MultiGameState = multiGame.getState();
    multiGame.setState({
      frame: 10,
      gameStates: [
        { ...state.gameStates[0], frame: 10 },
        { ...getComboState(state.gameStates[1]), mode: GameMode.Reconcile },
      ],
    });

    multiGame.tick([
      [],
      [{ type: GameActionType.Garbage, colors: [GameColor.Color1, GameColor.Color2] }],
    ]);
    const nextState = multiGame.getState();
    const visibleGarbage = nextState.gameStates[1].grid[1].filter((cell) => {
      return cell.type === GridObjectType.PillSegment;
    });

    expect(nextState.gameStates[1].garbage).toEqual([]);
    expect(visibleGarbage).toHaveLength(2);
    expect(visibleGarbage.map((cell) => cell.color).sort()).toEqual([GameColor.Color1, GameColor.Color2]);
  });

  test("returns a multigame win when exactly one player wins", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const state: MultiGameState = multiGame.getState();
    multiGame.setState({
      frame: 20,
      gameStates: [getWinState(state.gameStates[0]), { ...state.gameStates[1], frame: 20 }],
    });

    const result = {
      type: MultiGameResultType.Win,
      player: 0,
    };

    expect(multiGame.tick().result).toEqual(result);
    expect(multiGame.getState().result).toEqual(result);
  });

  test("returns a multigame draw when multiple players win on the same frame", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const state: MultiGameState = multiGame.getState();
    multiGame.setState({
      frame: 20,
      gameStates: [getWinState(state.gameStates[0]), getWinState(state.gameStates[1])],
    });

    expect(multiGame.tick().result).toEqual({
      type: MultiGameResultType.Draw,
      players: [0, 1],
    });
  });

  test("returns a multigame win when a player wins as another player loses", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const state: MultiGameState = multiGame.getState();
    multiGame.setState({
      frame: 30,
      gameStates: [getWinState(state.gameStates[0]), getLoseState(state.gameStates[1])],
    });

    expect(multiGame.tick().result).toEqual({
      type: MultiGameResultType.Win,
      player: 0,
    });
  });

  test("returns a multigame lose when exactly one player loses", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const state: MultiGameState = multiGame.getState();
    multiGame.setState({
      frame: 30,
      gameStates: [getLoseState(state.gameStates[0]), { ...state.gameStates[1], frame: 30 }],
    });

    expect(multiGame.tick().result).toEqual({
      type: MultiGameResultType.Lose,
      player: 0,
    });
  });

  test("returns a multigame draw when multiple players lose on the same frame", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const state: MultiGameState = multiGame.getState();
    multiGame.setState({
      frame: 30,
      gameStates: [getLoseState(state.gameStates[0]), getLoseState(state.gameStates[1])],
    });

    expect(multiGame.tick().result).toEqual({
      type: MultiGameResultType.Draw,
      players: [0, 1],
    });
  });

  test("does not tick child games after the multigame has ended", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const state: MultiGameState = multiGame.getState();
    multiGame.setState({
      frame: 20,
      gameStates: [getWinState(state.gameStates[0]), { ...state.gameStates[1], frame: 20 }],
    });

    const result = multiGame.tick().result;
    const endedState = multiGame.getState();
    const secondTickResult = multiGame.tick();

    expect(secondTickResult).toEqual({
      gameResults: [undefined, undefined],
      result,
    });
    expect(multiGame.getState()).toEqual(endedState);
  });

  test("setState can restore either ended or active multigame state", () => {
    const multiGame = new MultiGame({
      players: 2,
      seed: mockSeed,
      gameOptions: getMultiGameOptions(),
    });
    const activeState = multiGame.getState();
    const result = {
      type: MultiGameResultType.Lose,
      player: 0,
    };

    multiGame.setState({ ...activeState, result });
    expect(multiGame.tick()).toEqual({
      gameResults: [undefined, undefined],
      result,
    });
    expect(multiGame.getState().frame).toBe(0);

    multiGame.setState({ ...activeState, result: undefined });
    multiGame.tick();
    expect(multiGame.getState().frame).toBe(1);
  });
});
