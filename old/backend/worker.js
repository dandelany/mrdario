var _ = require('lodash');
var express = require('express');
var redis = require('redis');
var uuid = require('uuid');
var randomWord = require('random-word-by-length');
var {format} = require('date-fns');

var scoreUtils = require('./scores/utils');

function makeGameToken() {
  return Math.round(Math.random() * 1000000).toString(36);
}

function initSingleGame() {
  // const id = uuid.v4();
  const id = _.times(3, () => _.capitalize(randomWord(8))).join('');
  const token = makeGameToken();
  return {id, token};
}

function getClientIpAddress(socket) {
  return _.get(socket, 'request.headers.x-forwarded-for', socket.remoteAddress);
}
function getSocketInfo(socket) {
  return {
    state: socket.state,
    ip: getClientIpAddress(socket),
    id: socket.id,
    ua: _.get(socket, 'request.headers.user-agent', ''),
    time: Number(new Date())
  };
}
function socketInfoStr(socket) { return JSON.stringify(getSocketInfo(socket)); }

function logWithTime(...args) {
  console.log(format(new Date(), 'MM-DD-YYYY HH:mm:ss'), ...args);
}

module.exports.run = function (worker) {
  console.log('   >> Worker PID:', process.pid);

  var app = require('express')();

  var httpServer = worker.httpServer;
  var scServer = worker.scServer;

  httpServer.on('request', app);


  // initialize redis client for storage
  var rClient = redis.createClient();
  rClient.on("error", function (err) {
    logWithTime("Error " + err);
  });


  // Websocket API worker
  // Handle incoming socket connections, and listen for events
  scServer.on('connection', function (socket) {

    // console.log('CONNECT: ', socketInfoStr(socket));
    logWithTime('Connected: ', getClientIpAddress(socket));

    socket.on('disconnect', function () {
      logWithTime('Disconnected: ', getClientIpAddress(socket));
    });
    socket.on('error', (err) => {
      logWithTime('ERROR ', err.name, err.message, ': ',  socketInfoStr(socket));
    });

    socket.on('singleGameScore', (data, res) => {
      scoreUtils.handleSingleScore(rClient, data, function(err, rank, scoreInfo) {
        if(err) { res(err); return; }
        scoreUtils.getSingleHighScores(rClient, scoreInfo.level, 15, (err, scores) => {
          // logWithTime('SCORE:', JSON.stringify({rank, scoreInfo, socket: getSocketInfo(socket)}), '\u0007');
          logWithTime(`${scoreInfo.name} won on level ${scoreInfo.level}! Score: ${scoreInfo.score} (high score #${rank+1})`, '\u0007');
          res(err, {rank: rank, scores: scores});
        });
      });
    });
    
    socket.on('getSingleHighScores', (level, res) => {
      // console.log('getSingleHighScores', level);
      scoreUtils.getSingleHighScores(rClient, level, 50, (err, scores) => {
        res(err, {level: level, scores: scores});
      })
    });

    socket.on('infoStartGame', ([name, level, speed]) => {
      logWithTime(`${name} started level ${level} at speed ${speed}`);
    })

    socket.on('infoLostGame', ([name, level, speed, score]) => {
      logWithTime(`${name} lost level ${level} at speed ${speed} (score ${score})`);
    })

    // socket.on('moves', function (data) {
    //   console.log('got moves', data);
    // });
    //
    // socket.on('initSingleGame', () => {
    //   // const {id, token} = initSingleGame();
    //   // console.log('newSingleGame', id, token);
    //   // socket.emit('newSingleGame', {id, token});
    // });
  });
};
