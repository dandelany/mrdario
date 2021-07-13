"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("mrdario-core/src/api");
const utils_1 = require("../../utils");
const AbstractServerModule_1 = require("../../AbstractServerModule");
const highScoresStore_1 = require("./highScoresStore");
class HighScoresModule extends AbstractServerModule_1.AbstractServerModule {
    handleConnect(socket) {
        this.bindNoAuthListener(socket, {
            eventType: api_1.ScoresEventType.GetHighScores,
            codec: api_1.TGetHighScoresRequest,
            listener: async (level, respond) => {
                console.log('get', level);
                try {
                    const scores = await highScoresStore_1.getSingleHighScores2(this.rClient, level, 50);
                    respond(null, { level: level, scores: scores });
                }
                catch (err) {
                    if (err)
                        respond(err, null);
                }
            }
        });
        this.bindNoAuthListener(socket, {
            eventType: api_1.ScoresEventType.SaveScore,
            codec: api_1.TSaveScoreRequest,
            listener: async (data, respond) => {
                try {
                    const scoreInfo = await highScoresStore_1.handleSingleScore2(this.rClient, data);
                    const { level, rank } = scoreInfo;
                    const scores = await highScoresStore_1.getSingleHighScores2(this.rClient, level, 15);
                    respond(null, { rank, scores });
                    logHighScore(scoreInfo, rank);
                }
                catch (err) {
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
exports.HighScoresModule = HighScoresModule;
function logHighScore(scoreInfo, rank) {
    utils_1.logWithTime(`${scoreInfo.name} won on level ${scoreInfo.level}! Score: ${scoreInfo.score} (high score #${rank + 1})`, 
    // bell character to wake up anyone tailing the logs :)
    "\u0007");
}
exports.logHighScore = logHighScore;
//# sourceMappingURL=HighScoresModule.js.map