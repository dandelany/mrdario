import {
  GetHighScoresRequest,
  GetHighScoresResponse,
  SaveScoreRequest,
  SaveScoreResponse,
  ScoresEventType,
  TGetHighScoresRequest,
  TSaveScoreRequest
} from "mrdario-core/api";

import { logWithTime } from "../../utils/index.js";
import { defineServerModule } from "../../runtime/types.js";
import {
  getSingleHighScores2,
  handleSingleScore2,
  SingleScoreDataObj
} from "./highScoresStore.js";

export function createHighScoresModule() {
  return defineServerModule({
    name: "highScores",
    procedures: [
      {
        auth: "none",
        eventType: ScoresEventType.GetHighScores,
        codec: TGetHighScoresRequest,
        async handler({ services }, level: GetHighScoresRequest): Promise<GetHighScoresResponse> {
          const scores = await getSingleHighScores2(services.redisClient, level, 50);
          return { level, scores };
        }
      },
      {
        auth: "none",
        eventType: ScoresEventType.SaveScore,
        codec: TSaveScoreRequest,
        async handler({ services }, data: SaveScoreRequest): Promise<SaveScoreResponse> {
          const scoreInfo = await handleSingleScore2(services.redisClient, data);
          const { level, rank } = scoreInfo;
          const scores = await getSingleHighScores2(services.redisClient, level, 15);
          logHighScore(scoreInfo, rank);
          return { rank, scores };
        }
      }
    ]
  });
}

export function logHighScore(scoreInfo: SingleScoreDataObj, rank: number): void {
  logWithTime(
    `${scoreInfo.name} won on level ${scoreInfo.level}! Score: ${scoreInfo.score} (high score #${rank + 1})`,
    "\u0007"
  );
}
