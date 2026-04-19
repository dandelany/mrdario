afterAll(async () => {
  try {
    const { closeRedisClient } = await import('../lib/utils/redis.js');
    await closeRedisClient();
  } catch (_) {}
});
