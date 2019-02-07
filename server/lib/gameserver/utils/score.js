"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
function getSingleLevelHighScoresSetKey(level) {
    return "hiscore_" + Math.floor(level);
}
function getHighScoreNameKey(name) {
    return (name + "").replace(/__&&__/g, "__&__").substr(0, 100) + "__&&__" + Number(new Date());
}
function handleSingleScore(rClient, data, callback) {
    if (!_.isArray(data) || data.length != 3)
        return;
    var row = data;
    var level = row[0];
    var name = row[1];
    var score = row[2];
    if (!_.isFinite(level) || level >= 50 || level < 0)
        return;
    if (!_.isFinite(score) || score < 0)
        return;
    var nameKey = getHighScoreNameKey(name);
    addSingleScore(rClient, level, nameKey, score, function onAddedSingleScore(err, _addReply) {
        if (err)
            callback(err);
        getHighScoreNameKeyRank(rClient, level, nameKey, function onGotScoreRank(err, rankReply) {
            callback(err, rankReply, { level: level, name: name, score: score });
        });
    });
}
exports.handleSingleScore = handleSingleScore;
function addSingleScore(rClient, level, nameKey, score, callback) {
    var setKey = getSingleLevelHighScoresSetKey(level);
    return rClient.zadd(setKey, score, nameKey, callback);
}
function getHighScoreNameKeyRank(rClient, level, nameKey, callback) {
    var setKey = getSingleLevelHighScoresSetKey(level);
    return rClient.zrevrank(setKey, nameKey, callback);
}
function parseHighScores(rawScores) {
    return _.chunk(rawScores, 2)
        .map(function (scoreArr) {
        var name = scoreArr[0] || "Anonymous";
        var score = scoreArr[1] || 0;
        return [name.split("__&&__")[0], Math.floor(score)];
    })
        .reverse();
}
function getSingleHighScores(rClient, level, count, callback) {
    var setKey = getSingleLevelHighScoresSetKey(level);
    return rClient.zrange(setKey, -count, -1, "withscores", function (err, topScoreReplies) {
        // console.log("topScoreReplies", parseTopScores(topScoreReplies));
        if (callback)
            callback(err, parseHighScores(topScoreReplies));
    });
}
exports.getSingleHighScores = getSingleHighScores;
