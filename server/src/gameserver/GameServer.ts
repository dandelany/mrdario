
import { RedisClient } from "redis";
import {SCServer, SCServerSocket} from "socketcluster-server";
import { truncate } from "lodash";
import uuid from "uuid/v4";

import { getClientIpAddress, logWithTime, socketInfoStr } from "./utils";
import { handleSingleScore, getSingleHighScores } from "./utils/score";

type LobbyUser = {
  name: string,
  id: string,
  joined: number
};

export class GameServer {
  scServer: SCServer;
  rClient: RedisClient;
  // todo store in redis?
  lobby: LobbyUser[];

  constructor(scServer: SCServer, rClient: RedisClient) {
    this.scServer = scServer;
    this.rClient = rClient;
    this.lobby = [];
    scServer.on('connection', this.handleConnect);
  }

  protected handleConnect = (socket: SCServerSocket) => {
    logWithTime('Connected: ', getClientIpAddress(socket));
    // socket.on("hello", () => {})

    socket.on('disconnect', function () {
      logWithTime('Disconnected: ', getClientIpAddress(socket));
    });
    socket.on('error', (err) => {
      logWithTime('ERROR ', err.name, err.message, ': ',  socketInfoStr(socket));
    });

    // @ts-ignore
    socket.on('singleGameScore', (data: any, res: any) => {
      handleSingleScore(this.rClient, data, (err, rank, scoreInfo) => {
        if(err) { res(err); return; }
        if(scoreInfo) {
          getSingleHighScores(this.rClient, scoreInfo.level, 15, (err, scores) => {
            // logWithTime('SCORE:', JSON.stringify({rank, scoreInfo, socket: getSocketInfo(socket)}), '\u0007');
            logWithTime(`${scoreInfo.name} won on level ${scoreInfo.level}! Score: ${scoreInfo.score} (high score #${rank+1})`, '\u0007');
            res(err, {rank: rank, scores: scores});
          });
        }
      });
    });

    // @ts-ignore
    socket.on('getSingleHighScores', (level: number, res) => {
      console.log('getSingleHighScores', level);
      getSingleHighScores(this.rClient, level, 50, (err, scores) => {
        res(err, {level: level, scores: scores});
      })
    });

    // @ts-ignore
    socket.on('joinLobby', (name: string, res) => {
      const user: LobbyUser = {
        name: truncate(name, {length: 100}),
        id: uuid(),
        joined: Date.now()
      };
      this.lobby.push(user);
      res(null, this.lobby);
    })


    // socket.on('infoStartGame', ([name, level, speed]) => {
    //   logWithTime(`${name} started level ${level} at speed ${speed}`);
    // })
    //
    // socket.on('infoLostGame', ([name, level, speed, score]) => {
    //   logWithTime(`${name} lost level ${level} at speed ${speed} (score ${score})`);
    // })

    // socket.on('moves', function (data) {
    //   console.log('got moves', data);
    // });
    //
    // socket.on('initSingleGame', () => {
    //   // const {id, token} = initSingleGame();
    //   // console.log('newSingleGame', id, token);
    //   // socket.emit('newSingleGame', {id, token});
    // });
  }
}
