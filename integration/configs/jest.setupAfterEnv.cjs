const redisUtils = require('../src/utils/redis');

afterAll(async () => {
  await redisUtils.closeRedisClient();
});
