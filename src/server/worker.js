var _ = require('lodash');
var express = require('express');
var redis = require('redis');
var uuid = require('uuid');
var randomWord = require('random-word-by-length');

function makeGameToken() {
  return Math.round(Math.random() * 1000000).toString(36);
}

function initSingleGame() {
  // const id = uuid.v4();
  const id = _.times(3, () => _.capitalize(randomWord(8))).join('');
  const token = makeGameToken();
  return {id, token};
}

function handleSingleScore(rClient, callback, data) {
  console.log('singleGameScore');
  console.log(data);
  if(!_.isArray(data) || data.length != 3) return;
  var level = data[0];
  var name = data[1];
  var score = data[2];
  if(!_.isFinite(level) || level >= 50 || level < 0) return;
  if(!_.isFinite(score) || score < 0) return;

  addSingleScore(rClient, level, name, score, callback);
}

function addSingleScore(rClient, level, name, score, callback) {
  const setKey = 'hiscore_' + level;
  const nameKey = (name + '').replace(/__&&__/g, '__&__').substr(0, 100) + '__&&__' + Number(new Date());

  rClient.zadd(setKey, score, nameKey,
    function(err, addReply) {
      console.log("addReply",addReply);

      rClient.zrange(setKey, -10, -1, 'withscores', function(err, topScoreReplies) {
        console.log("topScoreReplies", parseTopScores(topScoreReplies));
        callback(err, parseTopScores(topScoreReplies));
      })
    }
  );
}

function parseTopScores(rawScores) {
  return _.chunk(rawScores, 2).map(([name, score]) => (
    [name.split('__&&__')[0], parseInt(score)]
  ));
}


module.exports.run = function (worker) {
  console.log('   >> Worker PID:', process.pid);

  var app = require('express')();

  var httpServer = worker.httpServer;
  var scServer = worker.scServer;

  httpServer.on('request', app);

  var count = 0;


  var rClient = redis.createClient();

  rClient.on("error", function (err) {
    console.log("Error " + err);
  });

  /*
    In here we handle our incoming realtime connections and listen for events.
  */
  scServer.on('connection', function (socket) {

    // Some sample logic to show how to handle client events,
    // replace this with your own logic

    socket.on('sampleClientEvent', function (data) {
      count++;
      console.log('Handled sampleClientEvent', data);
      scServer.exchange.publish('sample', count);
    });

    socket.on('moves', function (data) {
      console.log('got moves', data);
    });

    socket.on('initSingleGame', () => {
      const {id, token} = initSingleGame();
      console.log('newSingleGame', id, token);
      socket.emit('newSingleGame', {id, token});
    });



    socket.on('singleGameScore', handleSingleScore.bind(this, rClient, function(err, topScores) {
      if(!err) socket.emit('singleHighScores', topScores);
    }));

    socket.on('disconnect', function () {
      // clearInterval(interval);
    });
  });
};
