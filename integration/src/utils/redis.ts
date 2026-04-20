import { createClient, type RedisClientType } from "redis";
import fs from "fs";

export const REDIS_TEST_DB = 15;

let redisClient: RedisClientType | undefined;
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({ database: REDIS_TEST_DB });
  await redisClient.connect();
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) {
    return;
  }

  const clientToClose = redisClient;
  redisClient = undefined;
  await clientToClose.quit();
}

export async function clearRedisTestDB(rClient: RedisClientType): Promise<string> {
  await rClient.select(REDIS_TEST_DB);
  return rClient.flushDb();
}

export async function getRedisDumpPath(rClient: RedisClientType): Promise<string> {
  const dir = await rClient.configGet("dir");
  const dbfilename = await rClient.configGet("dbfilename");
  const path = `${dir.dir}/${dbfilename.dbfilename}`;
  console.log(path);
  return path;
}

export async function redisSave(rClient: RedisClientType): Promise<string> {
  return rClient.sendCommand<string>(["SAVE"]);
}

export async function asyncCopyFile(src: fs.PathLike, dest: fs.PathLike): Promise<null> {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, err => {
      if (err) reject(err);
      else resolve(null);
    });
  });
}

export async function backupRedis(rClient: RedisClientType) {
  const dumpFilePath = await getRedisDumpPath(rClient);
  const saved = await redisSave(rClient);

  console.log("saved", saved);

  await asyncCopyFile(dumpFilePath, "./rbackup.rdb");

  return dumpFilePath;
}
