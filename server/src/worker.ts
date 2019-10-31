import SCWorker from "socketcluster/scworker";
import express from "express";
import serveStatic from "serve-static";
import path from "path";
import morgan from "morgan";
import healthChecker from "sc-framework-health-check";
import redis from "redis";

import { GameServer } from "./gameserver/GameServer";
import {logWithTime} from "./gameserver/utils";

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
    // use redis database 15 for testing, to avoid accidentally deleting prod/dev data
    const redisDB = (process.env.TEST_ENV) ? 15 : 0;
    var rClient = redis.createClient({db: redisDB});
    rClient.on("error", function(err: string | Error) {
      logWithTime("Error " + err);
    });

    new GameServer(scServer, rClient);
  }
}

new Worker();
