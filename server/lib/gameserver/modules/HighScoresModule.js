"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var score_1 = require("../utils/score");
var log_1 = require("../utils/log");
// type HighScoresResponder =
//   | ((error: Error, data: null) => any)
//   | ((error: null, data: HighScoresResponse) => any);
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
            score_1.getSingleHighScores(_this.rClient, level, 50, function (err, scores) {
                var response = { level: level, scores: scores };
                respond(err, response);
            });
        });
        // @ts-ignore
        socket.on("singleGameScore", function (data, res) {
            score_1.handleSingleScore(_this.rClient, data, function (err, rank, scoreInfo) {
                if (err) {
                    res(err);
                    return;
                }
                if (scoreInfo) {
                    score_1.getSingleHighScores(_this.rClient, scoreInfo.level, 15, function (err, scores) {
                        log_1.logHighScore(scoreInfo, rank);
                        res(err, { rank: rank, scores: scores });
                    });
                }
            });
        });
    };
    return HighScoresModule;
}());
exports.HighScoresModule = HighScoresModule;
