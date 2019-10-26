const _ = require("lodash");
import { RedisClient} from "redis";
import { isFinite } from "lodash";

type SingleScoreDataRow = [number, string, number];
export interface SingleScoreDataObj {
  level: number;
  name: string;
  score: number;
  rank: number;
}

// export interface SingleScoreCallback2 {
//   (err: Error, scoreObj: null): void;
//   (error: null, scoreObj: SingleScoreDataObj): void;
// }

type ScoreDBRow = [string, number];

export async function handleSingleScore2(
  rClient: RedisClient,
  row: SingleScoreDataRow,
): Promise<SingleScoreDataObj> {
  const [level, name, score] = row;
  if (!isFinite(level) || level >= 50 || level < 0) {
    throw new Error("Error: invalid level");
  } else if (!isFinite(score) || score < 0) {
    throw new Error("Error: invalid score");
  }

  const nameKey: string = getHighScoreNameKey(name);
  await addSingleScore2(rClient, level, nameKey, score);

  const rank = await getHighScoreNameKeyRank2(rClient, level, nameKey);
  if(rank === null) throw new Error("Could not find score rank");

  return { level, name, score, rank };
}

function getSingleLevelHighScoresSetKey(level: number): string {
  return "hiscore_" + Math.floor(level);
}

function getHighScoreNameKey(name: string): string {
  // todo danger validate
  return (name + "").replace(/__&&__/g, "__&__").substr(0, 100) + "__&&__" + Number(new Date());
}


function addSingleScore2(
  rClient: RedisClient,
  level: number,
  nameKey: string,
  score: number
): Promise<number> {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return new Promise((resolve, reject) => {
    rClient.zadd(setKey, score, nameKey, (err, data) => {
      if(err) reject(err);
      else resolve(data);
    });
  });
}

function getHighScoreNameKeyRank2(
  rClient: RedisClient,
  level: number,
  nameKey: string
): Promise<number | null> {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return new Promise(((resolve, reject) => {
    rClient.zrevrank(setKey, nameKey, (err, data) => {
      if(err) reject(err);
      else resolve(data);
    });
  }));
}

function parseHighScores(rawScores: string[]): [string, number][] {
  return _.chunk(rawScores, 2)
    .map((scoreArr: ScoreDBRow) => {
      const name = scoreArr[0] || "Anonymous";
      const score = scoreArr[1] || 0;
      return [name.split("__&&__")[0], Math.floor(score)];
    })
    .reverse();
}


export function getSingleHighScores2(
  rClient: RedisClient,
  level: number,
  count: number,
): Promise<[string, number][]> {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return new Promise((resolve, reject) => {
    rClient.zrange(setKey, -Math.min(count, 1000), -1, "withscores", function(err, topScoreReplies) {
      if(err) reject(err);
      else resolve(parseHighScores(topScoreReplies));
    });
  });
}
