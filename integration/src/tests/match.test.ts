import { GameClient } from "mrdario-core/lib/client";
import { ClientAuthenticatedUser, MatchMode, SingleMatchInfo, TSingleMatchInfo } from "mrdario-core/src/api";
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

    test("Creates a match with options", async () => {
      const createdMatchInfo = await gameClient.createMatch({
        isPublic: true,
        level: 3,
        baseSpeed: 8,
      });
      expect(createdMatchInfo).toDecodeWith(TSingleMatchInfo);

      let expectedMatch: SingleMatchInfo = {
        id: expect.any(String),
        mode: MatchMode.Setup,
        creatorId: user.id,
        playerIds: [user.id],
        gamesOptions: [{
          level: 3,
          baseSpeed: 8,
        }],
        isPublic: true,
      };
      expect(createdMatchInfo).toMatchObject(expectedMatch);
      expect(createdMatchInfo.id.length).toBeGreaterThan(1);
    });

    describe("Create Match and test", () => {
      let createdMatchInfo: SingleMatchInfo;

      beforeEach(async () => {
        createdMatchInfo = await gameClient.createMatch({
          isPublic: true,
          level: 7,
          baseSpeed: 9,
        });
        console.log('created', createdMatchInfo);
      });
      afterEach(() => { /* todo: destroy match */ });

      test("getMatch gets the created Match", async () => {
        // use getMatch API to get match details - should give the same result as when we created it
        const matchInfoFromGet = await gameClient.getMatch(createdMatchInfo.id);
        expect(matchInfoFromGet).toEqual(createdMatchInfo);
        console.log('got', matchInfoFromGet);
      });

      test("Update single match", async () => {
        // modify the match settings
        await gameClient.updateMatchSettings({
          matchId: createdMatchInfo.id,
          gameIndex: 0,
          gameOptions: {
            baseSpeed: 11
          }
        });

        const updatedMatchInfo = await gameClient.getMatch(createdMatchInfo.id);
        console.log(updatedMatchInfo);

        let expectedMatch: SingleMatchInfo = {
          id: createdMatchInfo.id,
          mode: MatchMode.Setup,
          creatorId: user.id,
          playerIds: [user.id],
          gamesOptions: [{
            level: 7,
            baseSpeed: 11,
          }],
          isPublic: true,
        };
        expect(updatedMatchInfo).toMatchObject(expectedMatch);

        return true;
      });
    });

  });
});
