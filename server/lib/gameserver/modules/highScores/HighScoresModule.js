"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var highScoresStore_1 = require("./highScoresStore");
var log_1 = require("../../utils/log");
var HighScoresModule = /** @class */ (function () {
    function HighScoresModule(rClient) {
        this.rClient = rClient;
    }
    HighScoresModule.prototype.handleConnect = function (socket) {
        var _this = this;
        // todo type respond correctly
        //@ts-ignore
        socket.on("getSingleHighScores", function (level, respond) {
            console.log("getSingleHighScores", level);
            highScoresStore_1.getSingleHighScores(_this.rClient, level, 50, function (err, scores) {
                var response = { level: level, scores: scores };
                respond(err, response);
            });
        });
        // @ts-ignore
        socket.on("singleGameScore", function (data, res) {
            highScoresStore_1.handleSingleScore(_this.rClient, data, function (err, rank, scoreInfo) {
                if (err) {
                    res(err);
                    return;
                }
                if (scoreInfo) {
                    highScoresStore_1.getSingleHighScores(_this.rClient, scoreInfo.level, 15, function (err, scores) {
                        logHighScore(scoreInfo, rank);
                        res(err, { rank: rank, scores: scores });
                    });
                }
            });
        });
    };
    return HighScoresModule;
}());
exports.HighScoresModule = HighScoresModule;
function logHighScore(scoreInfo, rank) {
    log_1.logWithTime(scoreInfo.name + " won on level " + scoreInfo.level + "! Score: " + scoreInfo.score + " (high score #" + (rank + 1) + ")", 
    // bell character to wake up anyone tailing the logs :)
    "\u0007");
}
exports.logHighScore = logHighScore;
