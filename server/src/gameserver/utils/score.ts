const _ = require("lodash");
// var redis = require('redis');

import { RedisClient } from "redis";

type SingleScoreDataRow = [number, string, number];
interface SingleScoreDataObj {
  level: number;
  name: string;
  score: number;
}
type SingleScoreCallback = (
  err: Error | null | undefined,
  rankReply?: any,
  scoreObj?: SingleScoreDataObj
) => any;

type RawDBScores = Array<string | number>;
type ScoreDBRow = [string, number];

function getSingleLevelHighScoresSetKey(level: number): string {
  return "hiscore_" + Math.floor(level);
}

function getHighScoreNameKey(name: string): string {
  return (name + "").replace(/__&&__/g, "__&__").substr(0, 100) + "__&&__" + Number(new Date());
}

export function handleSingleScore(rClient: RedisClient, data: any, callback: SingleScoreCallback) {
  if (!_.isArray(data) || data.length != 3) return;
  const row = data as SingleScoreDataRow;
  const level = row[0];
  const name = row[1];
  const score = row[2];
  if (!_.isFinite(level) || level >= 50 || level < 0) return;
  if (!_.isFinite(score) || score < 0) return;

  const nameKey: string = getHighScoreNameKey(name);

  addSingleScore(rClient, level, nameKey, score, function onAddedSingleScore(
    err: Error | null | undefined,
    _addReply: any
  ) {
    if (err) callback(err);

    getHighScoreNameKeyRank(rClient, level, nameKey, function onGotScoreRank(
      err: Error | null | undefined,
      rankReply: any
    ) {
      callback(err, rankReply, { level: level, name: name, score: score });
    });
  });
}

function addSingleScore(
  rClient: RedisClient,
  level: number,
  nameKey: string,
  score: number,
  callback: (err: Error | null, reply: any) => any
) {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient.zadd(setKey, score, nameKey, callback);
}

function getHighScoreNameKeyRank(
  rClient: RedisClient,
  level: number,
  nameKey: string,
  callback: (err: Error | null, reply: any) => any
) {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient.zrevrank(setKey, nameKey, callback);
}

function parseHighScores(rawScores: RawDBScores) {
  return _.chunk(rawScores, 2)
    .map((scoreArr: ScoreDBRow) => {
      const name = scoreArr[0] || "Anonymous";
      const score = scoreArr[1] || 0;
      return [name.split("__&&__")[0], Math.floor(score)];
    })
    .reverse();
}

export function getSingleHighScores(
  rClient: RedisClient,
  level: number,
  count: number,
  callback: (err: Error | null, data: any) => any
) {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient.zrange(setKey, -count, -1, "withscores", function(err, topScoreReplies) {
    // console.log("topScoreReplies", parseTopScores(topScoreReplies));
    if (callback) callback(err, parseHighScores(topScoreReplies));
  });
}
