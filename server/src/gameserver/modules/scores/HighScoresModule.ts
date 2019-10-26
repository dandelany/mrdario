import { SCServerSocket } from "socketcluster-server";

import {
  GetHighScoresRequest,
  GetHighScoresResponse,
  SaveScoreRequest,
  SaveScoreResponse,
  ScoresEventType,
  TGetHighScoresRequest,
  TSaveScoreRequest
} from "mrdario-core/lib/api";

import { logWithTime } from "../../utils";
import { AbstractServerModule } from "../../AbstractServerModule";
import {
  getSingleHighScores2,
  handleSingleScore2,
  SingleScoreDataObj
} from "./highScoresStore";

export class HighScoresModule extends AbstractServerModule {
  public handleConnect(socket: SCServerSocket) {

    this.bindNoAuthListener<GetHighScoresRequest, GetHighScoresResponse>(socket, {
      eventType: ScoresEventType.GetHighScores,
      codec: TGetHighScoresRequest,
      listener: async (level, respond) => {
        console.log('get', level);
        try {
          const scores = await getSingleHighScores2(this.rClient, level, 50);
          respond(null, { level: level, scores: scores });
        } catch (err) {
          if (err) respond(err, null);
        }
      }
    });

    this.bindNoAuthListener<SaveScoreRequest, SaveScoreResponse>(socket, {
      eventType: ScoresEventType.SaveScore,
      codec: TSaveScoreRequest,
      listener: async (data, respond) => {
        try {
          const scoreInfo = await handleSingleScore2(this.rClient, data);
          const {level, rank} = scoreInfo;
          const scores = await getSingleHighScores2(this.rClient, level, 15);
          respond(null, { rank, scores });
          logHighScore(scoreInfo, rank);
        } catch (err) {
          respond(err, null);
        }
      }
    });
    //
    // // todo type respond correctly
    // //@ts-ignore
    // socket.on("getSingleHighScores", (level: number, respond: any) => {
    //   console.log("getSingleHighScores", level);
    //   getSingleHighScores(this.rClient, level, 50, (err, scores) => {
    //     const response: GetHighScoresResponse = { level: level, scores: scores };
    //     respond(err, response);
    //   });
    // });
    //
    // // @ts-ignore
    // socket.on("singleGameScore", (data: any, res: any) => {
    //   handleSingleScore(this.rClient, data, (err, rank, scoreInfo) => {
    //     if (err) {
    //       res(err);
    //       return;
    //     }
    //     if (scoreInfo) {
    //       getSingleHighScores(this.rClient, scoreInfo.level, 15, (err, scores) => {
    //         logHighScore(scoreInfo, rank);
    //         res(err, { rank: rank, scores: scores });
    //       });
    //     }
    //   });
    // });
  }
}

export function logHighScore(scoreInfo: SingleScoreDataObj, rank: number): void {
  logWithTime(
    `${scoreInfo.name} won on level ${scoreInfo.level}! Score: ${scoreInfo.score} (high score #${rank + 1})`,
    // bell character to wake up anyone tailing the logs :)
    "\u0007"
  );
}
