"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const lodash_1 = require("lodash");
async function handleSingleScore2(rClient, row) {
    const [level, name, score] = row;
    if (!lodash_1.isFinite(level) || level >= 50 || level < 0) {
        throw new Error("Error: invalid level");
    }
    else if (!lodash_1.isFinite(score) || score < 0) {
        throw new Error("Error: invalid score");
    }
    const nameKey = getHighScoreNameKey(name);
    await addSingleScore2(rClient, level, nameKey, score);
    const rank = await getHighScoreNameKeyRank2(rClient, level, nameKey);
    if (rank === null)
        throw new Error("Could not find score rank");
    return { level, name, score, rank };
}
exports.handleSingleScore2 = handleSingleScore2;
function getSingleLevelHighScoresSetKey(level) {
    return "hiscore_" + Math.floor(level);
}
function getHighScoreNameKey(name) {
    // todo danger validate
    return (name + "").replace(/__&&__/g, "__&__").substr(0, 100) + "__&&__" + Number(new Date());
}
function addSingleScore2(rClient, level, nameKey, score) {
    const setKey = getSingleLevelHighScoresSetKey(level);
    return new Promise((resolve, reject) => {
        rClient.zadd(setKey, score, nameKey, (err, data) => {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    });
}
function getHighScoreNameKeyRank2(rClient, level, nameKey) {
    const setKey = getSingleLevelHighScoresSetKey(level);
    return new Promise(((resolve, reject) => {
        rClient.zrevrank(setKey, nameKey, (err, data) => {
            if (err)
                reject(err);
            else
                resolve(data);
        });
    }));
}
function parseHighScores(rawScores) {
    return _.chunk(rawScores, 2)
        .map((scoreArr) => {
        const name = scoreArr[0] || "Anonymous";
        const score = scoreArr[1] || 0;
        return [name.split("__&&__")[0], Math.floor(score)];
    })
        .reverse();
}
function getSingleHighScores2(rClient, level, count) {
    const setKey = getSingleLevelHighScoresSetKey(level);
    return new Promise((resolve, reject) => {
        rClient.zrange(setKey, -Math.min(count, 1000), -1, "withscores", function (err, topScoreReplies) {
            if (err)
                reject(err);
            else
                resolve(parseHighScores(topScoreReplies));
        });
    });
}
exports.getSingleHighScores2 = getSingleHighScores2;
//# sourceMappingURL=highScoresStore.js.map