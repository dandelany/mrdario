import { times } from "lodash";
import { decodeGrid } from "../../encoding";
import {
  Game,
  GameColor,
  GameInput,
  GameInputMove,
  GameMode,
  GameOptions,
  GameState,
  GameTickResultType,
  GRAVITY_TABLE
} from "../../game";

/*
Y = Destroyed
X = Empty
O = PillTop Color1
W = PillTop Color2
G = PillTop Color3
M = PillBottom Color1
U = PillBottom Color2
E = PillBottom Color3
L = PillLeft Color1
T = PillLeft Color2
D = PillLeft Color3
J = PillRight Color1
R = PillRight Color2
B = PillRight Color3
K = PillSegment Color1
S = PillSegment Color2
C = PillSegment Color3
N = Virus Color1
V = Virus Color2
F = Virus Color3
*/

// always use the same test seed so the results are predictable
const mockSeed = "test-seed";

function getMockGameState(): Partial<GameState> {
  return {
    pill: undefined,
    seed: mockSeed,
    frame: 0,
    score: 0,
    timeBonus: 0,
    gameTicks: 0,
    modeTicks: 0,
    pillCount: 0,
    lineColors: [],
    movingCounters: new Map<GameInputMove, number>()
  };
}

function getMockGameOptions(): Partial<GameOptions> {
  return {
    level: 12,
    baseSpeed: 15,
    width: 8,
    height: 16,
    initialSeed: mockSeed
  };
}

describe("Game", () => {
  test("Game can be constructed", () => {
    const game = new Game();
    expect(game).toBeInstanceOf(Game);
  });

  test("Game has correct initial options & state after construction", () => {
    const game = new Game(getMockGameOptions());
    const state = game.getState();
    const expectedState: GameState = {
      ...getMockGameState(),
      mode: GameMode.Ready,
      nextPill: [GameColor.Color3, GameColor.Color2],
      grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XNFVVXXF
        XXXFNVFN
        XFNNXVXX
        XVVXFXXF
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `)
    } as GameState;
    expect(state).toEqual(expectedState);
  });

  test("Game is in Playing mode after first tick", () => {
    const game = new Game(getMockGameOptions());
    game.tick();
    const state = game.getState();
    expect(state).toEqual({
      ...getMockGameState(),
      mode: GameMode.Playing,
      frame: 1,
      nextPill: [GameColor.Color3, GameColor.Color2],
      grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XNFVVXXF
        XXXFNVFN
        XFNNXVXX
        XVVXFXXF
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `)
    });
  });

  test("Gets pill on second tick", () => {
    const game = new Game(getMockGameOptions());
    game.tick();
    game.tick();
    const state = game.getState();
    expect(state).toEqual({
      ...getMockGameState(),
      mode: GameMode.Playing,
      frame: 2,
      gameTicks: 1,
      modeTicks: 1,
      pillCount: 1,
      pill: [[1, 3], [1, 4]],
      grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXDRXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XNFVVXXF
        XXXFNVFN
        XFNNXVXX
        XVVXFXXF
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `),
      nextPill: [GameColor.Color1, GameColor.Color2]
    });
  });

  test("setState() sets the Game state, and Game behaves correctly after setState", () => {
    const game = new Game(getMockGameOptions());
    game.tick();
    const nextState: GameState = {
      mode: GameMode.Playing,
      movingCounters: new Map<GameInputMove, number>([[GameInput.Right, 7]]),
      grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XOXXXXXX
        XUXXXXXX
        XXXXXXXX
        XVFXXFVX
        XXXXXXXX
        XXXNNXXX
        VXXXXXXV
        XVXXXXVX
        XXFFFFXX
      `),
      pill: [[8, 1], [9, 1]],
      nextPill: [GameColor.Color3, GameColor.Color2],
      seed: "kerbal",
      frame: 551,
      score: 8763,
      timeBonus: 22,
      gameTicks: 527,
      modeTicks: 36,
      pillCount: 13,
      lineColors: []
    };
    game.setState(nextState);
    expect(game.getState()).toEqual(nextState);
    game.tick();
    game.tick();

    expect(game.getState()).toEqual({
      ...nextState,
      frame: 553,
      gameTicks: 529,
      pill: [[9, 2], [10, 2]],
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
        XXOXXXXX
        XXUXXXXX
        XVFXXFVX
        XXXXXXXX
        XXXNNXXX
        VXXXXXXV
        XVXXXXVX
        XXFFFFXX
      `)
    });
  });

  test("Playing mode loses the game when the entrance is blocked", () => {
    const game = new Game({
      ...getMockGameOptions()
    });
    game.tick();
    const nextState: GameState = {
      ...game.getState(),
      frame: 500,
      mode: GameMode.Playing,
      pill: undefined,
      modeTicks: 0,
      gameTicks: 400,
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
      `)
    };
    game.setState(nextState);
    const result = game.tick();
    expect(result).toEqual({type: GameTickResultType.Lose});

    expect(game.getState()).toEqual({
      ...nextState,
      mode: GameMode.Ended,
      frame: 501,
      gameTicks: 401,
      // todo modeTicks should really be 0
      modeTicks: 1,
      // todo pill should really be undefined
      pill: [[1, 3], [1, 4]]
    });
  });
  test("Gravity pulls the pill downwards in Playing mode", () => {
    const game = new Game(getMockGameOptions());
    const startState = {
      ...getMockGameState(),
      mode: GameMode.Playing,
      frame: 2,
      gameTicks: 1,
      modeTicks: 1,
      pillCount: 1,
      pill: [[1, 3], [1, 4]],
      grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXDRXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XNFVVXXF
        XXXFNVFN
        XFNNXVXX
        XVVXFXXF
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `),
      nextPill: [GameColor.Color1, GameColor.Color2]
    } as GameState;

    game.setState(startState);
    times(40, () => game.tick());

    expect(game.getState()).toEqual({
      ...startState,
      grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXXXXXX
        XXXDRXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XNFVVXXF
        XXXFNVFN
        XFNNXVXX
        XVVXFXXF
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `),
      frame: 42,
      gameTicks: 41,
      modeTicks: 1,
      pill: [[2, 3], [2, 4]]
    });
  });
  test("Playing mode goes to Reconcile mode when pill cannot move any further", () => {
    const options = getMockGameOptions();
    const startState = {
      ...getMockGameState(),
      mode: GameMode.Playing,
      frame: 100,
      gameTicks: 99,
      // set modeTicks to be the last frame before gravity tries to move pill down again
      modeTicks: GRAVITY_TABLE[options.baseSpeed as number],
      pillCount: 1,
      pill: [[6, 3], [6, 4]],
      grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXDRXXX
        XNFVVXXF
        XXXFNVFN
        XFNNXVXX
        XVVXFXXF
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `),
      nextPill: [GameColor.Color1, GameColor.Color2]
    } as GameState;

    const game = new Game(options);
    game.setState(startState);
    game.tick();

    expect(game.getState()).toEqual({
      ...startState,
      frame: 101,
      mode: GameMode.Reconcile,
      gameTicks: 100,
      modeTicks: 0,
      pill: undefined
    });
  });

  test("Reconcile clears the top row & goes to Cascade mode if no lines are found", () => {
    const options = getMockGameOptions();
    const startState = {
      ...getMockGameState(),
      mode: GameMode.Reconcile,
      frame: 100,
      gameTicks: 99,
      modeTicks: 0,
      pillCount: 10,
      pill: undefined,
      grid: decodeGrid(`gh,8:
        XXXXXXOX
        XXXXXXUX
        XXXXXXOX
        XXXXXXUX
        XXXXXXOX
        XXXXXXUX
        XXXXXXOX
        XNFVVXUF
        XXXFNVFN
        XFNNXVXX
        XVVXFXXF
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `),
      nextPill: [GameColor.Color1, GameColor.Color2]
    } as GameState;

    const game = new Game(options);
    game.setState(startState);
    game.tick();

    expect(game.getState()).toEqual({
      ...startState,
      frame: 101,
      mode: GameMode.Cascade,
      gameTicks: 99,
      modeTicks: 0,
      pill: undefined,
      grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXXXXSX
        XXXXXXOX
        XXXXXXUX
        XXXXXXOX
        XXXXXXUX
        XXXXXXOX
        XNFVVXUF
        XXXFNVFN
        XFNNXVXX
        XVVXFXXF
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `)
    });
  });

  test(
    "Reconcile sets lines to destroyed if they are found, and moves to Destruction mode afterwards if more viruses exist",
    () => {
      const options = getMockGameOptions();
      const startState = {
        ...getMockGameState(),
        mode: GameMode.Reconcile,
        frame: 100,
        gameTicks: 99,
        modeTicks: 0,
        pillCount: 10,
        pill: undefined,
        grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXWXXXX
        XVVUVVXX
        XXXWXXXX
        XXXUXXXX
        XFVVVFXX
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `),
        nextPill: [GameColor.Color1, GameColor.Color2]
      } as GameState;

      const game = new Game(options);
      game.setState(startState);
      game.tick();

      expect(game.getState()).toEqual({
        ...startState,
        frame: 101,
        mode: GameMode.Destruction,
        score: 780,
        lineColors: [GameColor.Color2, GameColor.Color2],
        gameTicks: 99,
        modeTicks: 0,
        pill: undefined,
        grid: decodeGrid(`gh,8:
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
        XXXYXXXX
        XYYYYYXX
        XXXYXXXX
        XXXYXXXX
        XFVYVFXX
        VXXFNXVV
        VNNXXXFX
        FNVVFXNF
        FXVVFFNV
        VVFXVXFV
        NFFNXXFX
      `)
      });
    }
  );

  test("Reconcile wins the game if all viruses are destroyed", () => {
    const options = getMockGameOptions();
    const startState = {
      ...getMockGameState(),
      mode: GameMode.Reconcile,
      frame: 100,
      gameTicks: 99,
      modeTicks: 0,
      pillCount: 10,
      pill: undefined,
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
      nextPill: [GameColor.Color1, GameColor.Color2]
    } as GameState;

    const game = new Game(options);
    game.setState(startState);
    const result = game.tick();

    expect(result).toEqual({type: GameTickResultType.Win});

    expect(game.getState()).toEqual({
      ...startState,
      frame: 101,
      mode: GameMode.Ended,
      score: 16591,
      timeBonus: 16541,
      lineColors: [GameColor.Color3],
      gameTicks: 99,
      modeTicks: 0,
      pill: undefined,
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
        XXXXXYSX
        XXXXKYXX
        XXXXXYXX
        XXXXXYXX
        XXXXXXXX
        XXXXXXXX
        XXXXXXXX
      `)
    });
  });

  test.todo("Destruction mode waits for a few ticks, then moves to Cascade mode");
  test.todo("Cascade ");

  // todo: test moves
  // todo: test emit garbage on line combo
  // todo: test receives garbage action

});
