import { RedisClient } from "redis";
import { SCServerSocket } from "socketcluster-server";

import { HighScoresResponse } from "mrdario-core/lib/api/types";

import { getSingleHighScores, handleSingleScore, SingleScoreDataObj } from "./highScoresStore";
import { logWithTime } from "../../utils";


export class HighScoresModule {
  rClient: RedisClient;

  constructor(rClient: RedisClient) {
    this.rClient = rClient;
  }
  public handleConnect(socket: SCServerSocket) {
    // todo type respond correctly
    //@ts-ignore
    socket.on("getSingleHighScores", (level: number, respond: any) => {
      console.log("getSingleHighScores", level);
      getSingleHighScores(this.rClient, level, 50, (err, scores) => {
        const response: HighScoresResponse = { level: level, scores: scores };
        respond(err, response);
      });
    });

    // @ts-ignore
    socket.on("singleGameScore", (data: any, res: any) => {
      handleSingleScore(this.rClient, data, (err, rank, scoreInfo) => {
        if (err) {
          res(err);
          return;
        }
        if (scoreInfo) {
          getSingleHighScores(this.rClient, scoreInfo.level, 15, (err, scores) => {
            logHighScore(scoreInfo, rank);
            res(err, { rank: rank, scores: scores });
          });
        }
      });
    });
  }
}

export function logHighScore(scoreInfo: SingleScoreDataObj, rank: number): void {
  logWithTime(
    `${scoreInfo.name} won on level ${scoreInfo.level}! Score: ${scoreInfo.score} (high score #${rank + 1})`,
    // bell character to wake up anyone tailing the logs :)
    "\u0007"
  );
}
