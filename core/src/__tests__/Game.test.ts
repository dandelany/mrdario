import Game from "../Game";
import { decodeGrid } from "../encoding";
import { GameColor, GameInputMove, GameMode } from "../types";

describe("Game", () => {
  test("can be constructed", () => {
    const game = new Game();
    expect(game).toBeInstanceOf(Game);
  });


  test.skip("has correct initial state after construction", () => {
    const game = new Game({
      level: 3,
      baseSpeed: 15,
      width: 8,
      height: 16,
      seed: 'test-seed'
    });
    const state = game.getState();
    const {mode, grid, ...otherState} = state;
    console.log(otherState);
    // expect(state).toEqual({
    console.log({
      mode: GameMode.Loading,
      pill: undefined,
      nextPill: [{ color: GameColor.Color2 }, { color: GameColor.Color3 }],
      movingCounters: new Map([]),
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
        XXXXXXVF
        XXXXNXXX
        NNXVXXNN
        XXXXXNXX
        VXXXXNXX
        XXXXFXXX
        XXXVXFXX
        XXXXXXXX
        XXXXXXXX
        XXXXXVXF
      `)
    })
  })
});
