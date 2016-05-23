var express = require('express');
var uuid = require('uuid');

function makeGameToken() {
  return Math.round(Math.random() * 1000000).toString(36);
}

function initSingleGame() {
  const id = uuid.v4();
  const token = makeGameToken();
  return {id, token};
}

module.exports.run = function (worker) {
  console.log('   >> Worker PID:', process.pid);

  var app = require('express')();

  var httpServer = worker.httpServer;
  var scServer = worker.scServer;

  httpServer.on('request', app);

  var count = 0;

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
      console.log('newSingleGame');
      const {id, token} = initSingleGame();
      socket.emit('newSingleGame', {id, token});
    });


    var interval = setInterval(function () {
      socket.emit('rand', {
        rand: Math.floor(Math.random() * 5)
      });
    }, 1000);

    socket.on('disconnect', function () {
      clearInterval(interval);
    });
  });
};
