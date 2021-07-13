import { GameController, GameControllerMode } from "./GameController2";
import { GameControllerActionType } from "./types";
import { assert } from "../../utils/assert";
// import { encodeGameState } from "../../api/game/encoding";
import { GameMode } from "../enums";

describe("GameController", () => {
  describe("One-Player Game", () => {
    let controller: GameController | undefined;

    afterEach(() => {
      if (controller) controller.cleanup();
      controller = undefined;
    });

    test("Constructed as 1-player game by default", () => {
      controller = new GameController();
      expect(controller).toBeInstanceOf(GameController);
      expect(controller.getState().gameOptions).toHaveLength(1);
    });

    test("Starts in Setup mode with correct initial state after construction", () => {
      controller = new GameController({
        players: 1,
        gameOptions: [
          {
            level: 3,
            baseSpeed: 22
          }
        ]
      });
      expect(controller.getState()).toMatchObject({
        mode: GameControllerMode.Setup,
        playersReady: [false],
        gameOptions: [{ level: 3, baseSpeed: 22, initialSeed: /\w+/ }]
      });
    });

    test("Settings action allows user to change game options in Setup mode", () => {
      controller = new GameController();
      controller.handleLocalAction({
        type: GameControllerActionType.Settings,
        player: 0,
        settings: { level: 19, baseSpeed: 4 }
      });
      expect(controller.getState()).toMatchObject({
        mode: GameControllerMode.Setup,
        playersReady: [false],
        gameOptions: [{ level: 19, baseSpeed: 4, initialSeed: /\w+/ }]
      });
    });

    test("Start action starts game", () => {
      controller = new GameController();
      controller.handleLocalAction({ type: GameControllerActionType.Start });
      const state = controller.getState();
      expect(state.mode).toEqual(GameControllerMode.Playing);
      assert(state.mode === GameControllerMode.Playing);
      expect(state.gameStates).toHaveLength(1);
      const gameState = state.gameStates[0];
      expect(gameState).toMatchObject({
        mode: GameMode.Ready,
        frame: 0
      });
    });

    test("Seed option is used to initialize Game seed", () => {
      controller = new GameController({seed: "stella"});
      expect(controller.getState()).toMatchObject({
        mode: GameControllerMode.Setup,
        gameOptions: [{ initialSeed: "stella" }]
      });
      // ensure that the seed actually gets used when creating game
      controller.handleLocalAction({type: GameControllerActionType.Start});
      const state = controller.getState();
      assert(state.mode === GameControllerMode.Playing);
      expect(state.gameStates[0]).toMatchObject({
        mode: GameMode.Ready,
        seed: "stella"
      });
    });
  });
});
