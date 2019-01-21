import Game from "../Game";

describe("Game", () => {
  test("can be constructed", () => {
    const game = new Game();
    expect(game).toBeInstanceOf(Game);
  });
});
