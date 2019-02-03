import Game from "../Game";
import { decodeGrid } from "../encoding";
import { GameColor, GameInput, GameInputMove, GameMode } from "../types";

describe("Game", () => {
  test("can be constructed", () => {
    const game = new Game();
    expect(game).toBeInstanceOf(Game);
  });


  test("has correct initial state after construction", () => {
    const game = new Game({
      level: 12,
      baseSpeed: 15,
      width: 8,
      height: 16,
      seed: 'test-seed'
    });
    const state = game.getState();
    expect(state).toEqual({
      mode: GameMode.Loading,
      pill: undefined,
      nextPill: [{ color: GameColor.Color3 }, { color: GameColor.Color2 }],
      movingCounters: new Map([
        [GameInput.Up, 0],
        [GameInput.Down, 0],
        [GameInput.Left, 0],
        [GameInput.Right, 0],
        [GameInput.RotateCW, 0],
        [GameInput.RotateCCW, 0],
      ]),
      movingDirections: new Map<GameInputMove, true>(),
      seed: 'test-seed',
      frame: 0,
      score: 0,
      timeBonus: 0,
      gameTicks: 0,
      modeTicks: 0,
      pillCount: 0,
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
    })
  })
});
