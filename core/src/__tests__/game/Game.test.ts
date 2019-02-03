import { decodeGrid } from "@/encoding";
import { Game, GameState, GameOptions } from "@/game";
import { GameColor, GameInput, GameInputMove, GameMode } from "@/game/types";

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
    comboLineCount: 0,
    movingCounters: new Map<GameInputMove, number>([
      [GameInput.Up, 0],
      [GameInput.Down, 0],
      [GameInput.Left, 0],
      [GameInput.Right, 0],
      [GameInput.RotateCW, 0],
      [GameInput.RotateCCW, 0]
    ]),
    movingDirections: new Map<GameInputMove, true>()
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
  test("can be constructed", () => {
    const game = new Game();
    expect(game).toBeInstanceOf(Game);
  });

  test("Has correct initial options & state after construction", () => {
    const game = new Game(getMockGameOptions());
    const state = game.getState();
    expect(state).toEqual({
      ...getMockGameState(),
      mode: GameMode.Ready,
      nextPill: [{ color: GameColor.Color3 }, { color: GameColor.Color2 }],
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

  test("Moves to Playing state after first tick", () => {
    const game = new Game(getMockGameOptions());
    game.tick();
    const state = game.getState();
    expect(state).toEqual({
      ...getMockGameState(),
      mode: GameMode.Playing,
      frame: 1,
      nextPill: [{ color: GameColor.Color3 }, { color: GameColor.Color2 }],
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
      nextPill: [{ color: GameColor.Color1 }, { color: GameColor.Color2 }],
    });
  });

  // todo: loses when entrance is blocked
  // todo: moveInputQueue
  // todo setState


});
