declare module "redis" {
  export type RedisClient = any;

  const redis: {
    createClient(options?: any): RedisClient;
  };

  export default redis;
}
