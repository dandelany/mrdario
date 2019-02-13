"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function logWithTime() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    console.log.apply(console, [new Date().toISOString()].concat(args));
}
exports.logWithTime = logWithTime;
function logHighScore(scoreInfo, rank) {
    logWithTime(scoreInfo.name + " won on level " + scoreInfo.level + "! Score: " + scoreInfo.score + " (high score #" + (rank + 1) + ")", 
    // bell character to wake up anyone tailing the logs :)
    "\u0007");
}
exports.logHighScore = logHighScore;
