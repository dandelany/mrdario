import lodash from "lodash";
import type { RedisClientType } from "redis";

const { isFinite } = lodash;

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

export async function handleSingleScore2(
  rClient: RedisClientType,
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
  rClient: RedisClientType,
  level: number,
  nameKey: string,
  score: number
): Promise<number> {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient.zAdd(setKey, { score, value: nameKey });
}

function getHighScoreNameKeyRank2(
  rClient: RedisClientType,
  level: number,
  nameKey: string
): Promise<number | null> {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient.zRevRank(setKey, nameKey).then(rank => {
    return typeof rank === "number" ? rank : null;
  });
}

function parseHighScores(rawScores: { value: string; score: number }[]): [string, number][] {
  return rawScores
    .map((scoreRow): [string, number] => {
      const name = scoreRow.value || "Anonymous";
      const score = scoreRow.score || 0;
      return [name.split("__&&__")[0], Math.floor(score)];
    })
    .reverse();
}


export function getSingleHighScores2(
  rClient: RedisClientType,
  level: number,
  count: number,
): Promise<[string, number][]> {
  // get the key for the redis zset which holds the level's high scores
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient
    .zRangeWithScores(setKey, -Math.min(count, 1000), -1)
    .then(parseHighScores);
}
