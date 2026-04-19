import { closeRedisClient } from "../lib/utils/redis.js";

afterAll(async () => {
  await closeRedisClient();
});
