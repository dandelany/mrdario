import { ClientGameController3 } from "./ClientGameController3";
import { GameController3Mode } from "./types";
import { GameInput, InputEventType, InputManager } from "../..";
import { EventEmitter } from "events";
import { encodeGameState } from "../../../api/game/encoding";
// import { assert } from "../../utils/assert";
// import { encodeGameState } from "../../api/game/encoding";

export function sleep(time: number): Promise<number> {
  return new Promise(resolve => setTimeout(resolve, time));
}


class MockInputManager extends EventEmitter implements InputManager {
  setMode() {}
  public handleInput(input: GameInput, eventType: InputEventType) {
    super.emit("input", input, eventType);
  }
}

describe("GameController", () => {
  describe("One-Player Game", () => {
    let controller: ClientGameController3 | undefined;

    // afterEach(() => {
    //   if (controller) controller.cleanup();
    //   controller = undefined;
    // });

    test("Constructed as 1-player game by default", () => {
      controller = new ClientGameController3();
      expect(controller).toBeInstanceOf(ClientGameController3);
      expect(controller.getState().gameOptions).toHaveLength(1);
    });

    test("Starts in Setup mode with correct initial state after construction", () => {
      controller = new ClientGameController3({
        players: 1,
        gameOptions: [
          {
            level: 3,
            baseSpeed: 22
          }
        ],
      });
      expect(controller.getState()).toMatchObject({
        mode: GameController3Mode.Ready,
        gameOptions: [{ level: 3, baseSpeed: 22, initialSeed: /\w+/ }]
      });

      // console.log(controller.getState().gameStates[0]);
    });

    test("Starts & handles inputs", async () => {
      const mockManager = new MockInputManager();
      controller = new ClientGameController3({
        players: 1,
        gameOptions: [
          {
            level: 3,
            baseSpeed: 22
          }
        ],
        inputManagers: [[mockManager]]
      });
      controller.start();
      await sleep(1200);
      mockManager.handleInput(GameInput.Right, InputEventType.KeyDown);
      mockManager.handleInput(GameInput.Right, InputEventType.KeyDown);
      console.log(encodeGameState(controller.getState().gameStates[0]));
      // todo write expects
    });

    //
    // test("Settings action allows user to change game options in Setup mode", () => {
    //   controller = new ClientGameController3();
    //   controller.handleLocalAction({
    //     type: GameControllerActionType.Settings,
    //     player: 0,
    //     settings: { level: 19, baseSpeed: 4 }
    //   });
    //   expect(controller.getState()).toMatchObject({
    //     mode: GameControllerMode.Setup,
    //     playersReady: [false],
    //     gameOptions: [{ level: 19, baseSpeed: 4, initialSeed: /\w+/ }]
    //   });
    // });
    //
    // test("Start action starts game", () => {
    //   controller = new GameController();
    //   controller.handleLocalAction({ type: GameControllerActionType.Start });
    //   const state = controller.getState();
    //   expect(state.mode).toEqual(GameControllerMode.Playing);
    //   assert(state.mode === GameControllerMode.Playing);
    //   expect(state.gameStates).toHaveLength(1);
    //   const gameState = state.gameStates[0];
    //   expect(gameState).toMatchObject({
    //     mode: GameMode.Ready,
    //     frame: 0
    //   });
    // });
    //
    // test("Seed option is used to initialize Game seed", () => {
    //   controller = new GameController({seed: "stella"});
    //   expect(controller.getState()).toMatchObject({
    //     mode: GameControllerMode.Setup,
    //     gameOptions: [{ initialSeed: "stella" }]
    //   });
    //   // ensure that the seed actually gets used when creating game
    //   controller.handleLocalAction({type: GameControllerActionType.Start});
    //   const state = controller.getState();
    //   assert(state.mode === GameControllerMode.Playing);
    //   expect(state.gameStates[0]).toMatchObject({
    //     mode: GameMode.Ready,
    //     seed: "stella"
    //   });
    // });
  });
});
