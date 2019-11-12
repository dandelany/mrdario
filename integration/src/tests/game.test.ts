import { ClientAuthenticatedUser, TCreateSingleGameResponse } from "mrdario-core/lib/api";
import { GameClient } from "mrdario-core/lib/client";

import { connectGameClient } from "../utils";
import { toDecodeWith } from "mrdario-core/src/utils/jest";

expect.extend({ toDecodeWith });

describe("Game", () => {
  describe("Connect and test", () => {
    let gameClient: GameClient;
    let user: ClientAuthenticatedUser;
    beforeEach(async () => {
      gameClient = await connectGameClient();
      const loginPromise = gameClient.login("TestUser");
      await expect(loginPromise).resolves.toBeTruthy();
      user = await loginPromise;
      console.log(user);
    });
    afterEach(() => gameClient.disconnect());

    // todo test authentication

    test("Can create a single player game", async () => {
      const level = 15;
      const baseSpeed = 10;
      const creating = gameClient.createSingleGame(level, baseSpeed);
      await expect(creating).resolves.toDecodeWith(TCreateSingleGameResponse);
      await expect(creating).resolves.toMatchObject({
        id: /\w+/,
        creator: user.id,
        gameOptions:{
          initialSeed: /w+/,
          level,
          baseSpeed
        }
      });
    });
  });
});
