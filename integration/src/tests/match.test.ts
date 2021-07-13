import { GameClient } from "mrdario-core/lib/client";
import { ClientAuthenticatedUser, TSingleMatchInfo } from "mrdario-core/src/api";
import { connectGameClient } from "../utils";
import { toDecodeWith } from "mrdario-core/src/utils/jest";

expect.extend({ toDecodeWith });

describe("Match", () => {
  // test.todo("Must be authenticated to perform match actions");

  // describe("Connect and test", () => {});

  describe("Login and test", () => {
    let gameClient: GameClient;
    let user: ClientAuthenticatedUser;

    beforeEach(async () => {
      gameClient = await connectGameClient();
      const loginPromise = gameClient.login("TestUser");
      await expect(loginPromise).resolves.toBeTruthy();
      user = await loginPromise;
    });
    afterEach(() => gameClient.disconnect());

    test("Can create single match", async () => {
      const matchInfo = await gameClient.createSingleMatch({
        isPublic: false,
        level: 18,
        baseSpeed: 9
      });
      console.log("match info", matchInfo);

      expect(matchInfo).toDecodeWith(TSingleMatchInfo);

      expect(matchInfo).toMatchObject({
        id: expect.any(String),
        creatorId: user.id,
        playerIds: [user.id],
        isPublic: false,
        level: 18,
        baseSpeed: 9
      });
      expect(matchInfo.id.length).toBeGreaterThan(1);
      // expect(matchInfo.level).toEqual(18);
      // expect(matchInfo.baseSpeed).toEqual(9);
      // expect(matchInfo.creatorId).toEqual(user.id);

      console.log("single match");

      return true;
    });
  });
});
