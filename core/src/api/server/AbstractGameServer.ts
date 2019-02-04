// import {SCServer, SCServerSocket} from "socketcluster-server";
// import { getClientIpAddress, logWithTime, socketInfoStr } from "./utils";
//
// export interface GameServerOptions {
//
// }
//
// export abstract class AbstractGameServer {
//   protected scServer: SCServer;
//
//   constructor(scServer: SCServer) {
//     this.scServer = scServer;
//     scServer.on('connection', this.handleConnect);
//   }
//   protected handleConnect(socket: SCServerSocket) {
//     logWithTime('Connected: ', getClientIpAddress(socket));
//     // socket.on("hello", () => {})
//
//     socket.on('disconnect', function () {
//       logWithTime('Disconnected: ', getClientIpAddress(socket));
//     });
//     socket.on('error', (err) => {
//       logWithTime('ERROR ', err.name, err.message, ': ',  socketInfoStr(socket));
//     });
//
//     // @ts-ignore
//     socket.on('singleGameScore', (_data, _res) => {
//       // scoreUtils.handleSingleScore(rClient, data, function(err, rank, scoreInfo) {
//       //   if(err) { res(err); return; }
//       //   scoreUtils.getSingleHighScores(rClient, scoreInfo.level, 15, (err, scores) => {
//       //     // logWithTime('SCORE:', JSON.stringify({rank, scoreInfo, socket: getSocketInfo(socket)}), '\u0007');
//       //     logWithTime(`${scoreInfo.name} won on level ${scoreInfo.level}! Score: ${scoreInfo.score} (high score #${rank+1})`, '\u0007');
//       //     res(err, {rank: rank, scores: scores});
//       //   });
//       // });
//     });
//
//     socket.on('getSingleHighScores', (_level, _res) => {
//       // console.log('getSingleHighScores', level);
//       // scoreUtils.getSingleHighScores(rClient, level, 50, (err, scores) => {
//       //   res(err, {level: level, scores: scores});
//       // })
//     });
//
//     // socket.on('infoStartGame', ([name, level, speed]) => {
//     //   logWithTime(`${name} started level ${level} at speed ${speed}`);
//     // })
//     //
//     // socket.on('infoLostGame', ([name, level, speed, score]) => {
//     //   logWithTime(`${name} lost level ${level} at speed ${speed} (score ${score})`);
//     // })
//
//     // socket.on('moves', function (data) {
//     //   console.log('got moves', data);
//     // });
//     //
//     // socket.on('initSingleGame', () => {
//     //   // const {id, token} = initSingleGame();
//     //   // console.log('newSingleGame', id, token);
//     //   // socket.emit('newSingleGame', {id, token});
//     // });
//   }
//
//   protected handleSingleGameScore = () => {}
// }
//
