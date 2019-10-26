import { GameClient } from "mrdario-core/lib/client";
import { clearRedisTestDB, connectGameClient, getRedisClient } from "../utils";
import { RedisClient } from "redis";

describe("Scores", () => {
  let rClient: RedisClient;
  beforeAll(async () => {
    rClient = getRedisClient();
    await clearRedisTestDB(rClient);
  });

  let gameClient: GameClient;
  beforeEach(async () => {
    gameClient = await connectGameClient();
  });
  afterEach(() => gameClient.disconnect());

  test("Gets high scores", async () => {
    expect(true).toEqual(true);
    await expect(gameClient.getHighScores(10)).resolves.toEqual({ level: 10, scores: [] });
  });

  test("Saves high score and returns correct rank", async () => {
    await expect(gameClient.sendSingleGameHighScore(10, "dan", 102)).resolves.toEqual({
      rank: 0,
      scores: [["dan", 102]]
    });
    await expect(gameClient.sendSingleGameHighScore(10, "lio", 9999)).resolves.toEqual({
      rank: 0,
      scores: [["lio", 9999], ["dan", 102]]
    });
    await expect(gameClient.sendSingleGameHighScore(10, "bea", 1000)).resolves.toEqual({
      rank: 1,
      scores: [["lio", 9999], ["bea", 1000], ["dan", 102]]
    });
    // save on different level
    await expect(gameClient.sendSingleGameHighScore(3, "dan", 23)).resolves.toEqual({
      rank: 0,
      scores: [["dan", 23]]
    });
    // make sure getHighScores returns newly saved scores
    await expect(gameClient.getHighScores(10)).resolves.toEqual({
      level: 10,
      scores: [["lio", 9999], ["bea", 1000], ["dan", 102]]
    });
    await expect(gameClient.getHighScores(3)).resolves.toEqual({
      level: 3,
      scores: [["dan", 23]]
    });
  });

  // describe("Connect and test", () => {});
});
