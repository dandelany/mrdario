var _ = require('lodash');
var redis = require('redis');

function getSingleLevelHighScoresSetKey(level) {
  if(!_.isNumber(level)) return null;
  return 'hiscore_' + parseInt(level);
}
function getHighScoreNameKey(name) {
  return (name + '').replace(/__&&__/g, '__&__').substr(0, 100) + '__&&__' + Number(new Date());
}

function handleSingleScore(rClient, data, callback) {
  if(!_.isArray(data) || data.length != 3) return;
  var level = data[0];
  var name = data[1];
  var score = data[2];
  if(!_.isFinite(level) || level >= 50 || level < 0) return;
  if(!_.isFinite(score) || score < 0) return;

  const nameKey = getHighScoreNameKey(name);

  addSingleScore(rClient, level, nameKey, score, function onAddedSingleScore(err, addReply) {
    if(err) callback(err);

    getHighScoreNameKeyRank(rClient, level, nameKey, function onGotScoreRank(err, rankReply) {
      callback(err, rankReply, {level: level, name: name, score: score});
    });
  });
}

function addSingleScore(rClient, level, nameKey, score, callback) {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient.zadd(setKey, score, nameKey, callback);
}

function getHighScoreNameKeyRank(rClient, level, nameKey, callback) {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient.zrevrank(setKey, nameKey, callback);
}


function parseHighScores(rawScores) {
  return _.chunk(rawScores, 2).map((scoreArr) => {
    const name = scoreArr[0] || "Anonymous";
    const score = scoreArr[1] || 0;
    return [name.split('__&&__')[0], parseInt(score)];
  }).reverse();
}

function getSingleHighScores(rClient, level, count, callback) {
  const setKey = getSingleLevelHighScoresSetKey(level);
  return rClient.zrange(setKey, -count, -1, 'withscores', function(err, topScoreReplies) {
    // console.log("topScoreReplies", parseTopScores(topScoreReplies));
    if(callback) callback(err, parseHighScores(topScoreReplies));
  })
}

function getScoreRank(rClient, level, score, callback) {

}

function testMultiHighScores(rClient, level, count, callback) {
  const client = getSingleHighScores(rClient.multi(), level, count);

}

module.exports = {
  handleSingleScore: handleSingleScore,
  getSingleHighScores: getSingleHighScores
};
