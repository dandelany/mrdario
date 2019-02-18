import { GameServer } from "./gameserver/GameServer";

var SCWorker = require("socketcluster/scworker");
var express = require("express");
var serveStatic = require("serve-static");
var path = require("path");
var morgan = require("morgan");
var healthChecker = require("sc-framework-health-check");

// var {} = require('mrdario-')

var _ = require("lodash");
var redis = require("redis");
var randomWord = require("random-word-by-length");
var { format } = require("date-fns");

// var scoreUtils = require("./gameserver/modules/highScores/score");

function makeGameToken() {
  return Math.round(Math.random() * 1000000).toString(36);
}

function initSingleGame() {
  // const id = uuid.v4();
  const id = _.times(3, () => _.capitalize(randomWord(8))).join("");
  const token = makeGameToken();
  return { id, token };
}

function getClientIpAddress(socket) {
  return _.get(socket, "request.headers.x-forwarded-for", socket.remoteAddress);
}
function getSocketInfo(socket) {
  return {
    state: socket.state,
    ip: getClientIpAddress(socket),
    id: socket.id,
    ua: _.get(socket, "request.headers.user-agent", ""),
    time: Number(new Date())
  };
}
function socketInfoStr(socket) {
  return JSON.stringify(getSocketInfo(socket));
}

function logWithTime(...args) {
  console.log(format(new Date(), "MM-DD-YYYY HH:mm:ss"), ...args);
}

class Worker extends SCWorker {
  run() {
    console.log("   >> Worker PID:", process.pid);
    var environment = this.options.environment;
    var app = express();
    var httpServer = this.httpServer;
    var scServer = this.scServer;

    if (environment === "dev") {
      // Log every HTTP request.
      app.use(morgan("dev"));
    }
    app.use(serveStatic(path.resolve(__dirname, "public")));

    // Add GET /health-check express route
    healthChecker.attach(this, app);

    httpServer.on("request", app);

    // initialize redis client for storage
    var rClient = redis.createClient();
    rClient.on("error", function(err) {
      logWithTime("Error " + err);
    });

    const gameServer = new GameServer(scServer, rClient);
  }
}

new Worker();
