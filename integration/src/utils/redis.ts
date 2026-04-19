import redis, { RedisClient } from "redis";
import fs from "fs";

export const REDIS_TEST_DB = 15;

let redisClient: RedisClient;
export function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  redisClient = redis.createClient({db: REDIS_TEST_DB});
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (!redisClient) {
    return;
  }

  const clientToClose = redisClient;
  redisClient = undefined as any;

  await new Promise<void>((resolve) => {
    clientToClose.quit(() => {
      resolve();
    });
  });
}

export async function clearRedisTestDB(rClient: RedisClient): Promise<string> {
  return new Promise((resolve, reject) => {
    rClient.select(REDIS_TEST_DB, (err: any) => {
      if(err) reject(err);
      else {
        rClient.flushdb((err: any, flushReply: string) => {
          if(err) reject(err);
          else resolve(flushReply)
        })
      }
    })
  });
}

export async function getRedisDumpPath(rClient: RedisClient): Promise<string> {
  return new Promise((resolve, reject) => {
    rClient.config("get", "dir", (err: any, dir: string[]) => {
      rClient.config("get", "dbfilename", (err2: any, dbfilename: string[]) => {
        if (err) reject(err);
        else if (err2) reject(err2);
        else {
          //@ts-ignore
          const path = `${dir[1]}/${dbfilename[1]}`;
          console.log(path);
          resolve(path);
        }
      });
    });
  });
}

export async function redisSave(rClient: RedisClient): Promise<string> {
  return new Promise((resolve, reject) => {
    rClient.save((err: any, reply: string) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
}

export async function asyncCopyFile(src: fs.PathLike, dest: fs.PathLike): Promise<null> {
  return new Promise((resolve, reject) => {
    fs.copyFile(src, dest, err => {
      if (err) reject(err);
      else resolve(null);
    });
  });
}

export async function backupRedis(rClient: RedisClient) {
  const dumpFilePath = await getRedisDumpPath(rClient);
  const saved = await redisSave(rClient);

  console.log("saved", saved);

  await asyncCopyFile(dumpFilePath, "./rbackup.rdb");

  return dumpFilePath;
}
