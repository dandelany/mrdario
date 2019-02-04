// import { partial } from "lodash";
import { create as createSocket, SCClientSocket } from "socketcluster-client";
import { PathReporter } from "io-ts/lib/PathReporter";
import {
  GameScoreRequest,
  GameScoreResponse,
  HighScoresResponse,
  Lobby,
  TGameScoreResponse,
  THighScoresResponse,
  TLobby
} from "../types";

import * as t from "io-ts";
import { GameGrid } from "../../game";
import { encodeGrid } from "../../encoding";

export interface GameClientOptions {}

async function promisifySocketRequest<ResponseType, RequestType=any>(
  socket: SCClientSocket,
  eventName: string,
  requestData: RequestType,
  TResponseType: t.Any
): Promise<ResponseType> {
  return await new Promise<ResponseType>(function(resolve, reject) {
    socket.emit(eventName, requestData, (err: Error, data: any) => {
      if (err) reject(err);
      const decoded = TResponseType.decode(data);
      if (decoded.isRight()) {
        resolve(decoded.value);
      } else if (decoded.isLeft()) {
        reject(new Error(PathReporter.report(decoded)[0]));
      }
      resolve(data);
    });
  });
}

export class GameClient {
  public socket: SCClientSocket;

  constructor() {
    const socket = createSocket({ port: 8000 });

    socket.on("error", err => {
      console.error("Socket error - " + err);
      // todo call callback passed in options
    });

    socket.on("connect", function() {
      console.log("Socket connected - OK");
      // todo call callback passed in options
    });

    this.socket = socket;
  }

  public async joinLobby(name: string): Promise<Lobby> {
    return await promisifySocketRequest<Lobby>(this.socket, "joinLobby", name, TLobby);
  }

  public async getHighScores(level: number): Promise<HighScoresResponse> {
    return await promisifySocketRequest<HighScoresResponse>(
      this.socket,
      "getSingleHighScores",
      level,
      THighScoresResponse
    );
  }

  public sendSingleGameHighScore(
    level: number,
    name: string,
    score: number
  ): Promise<GameScoreResponse> {
    const request: GameScoreRequest = [level, name, score];
    return promisifySocketRequest<GameScoreResponse>(
      this.socket,
      "singleGameScore",
      request,
      TGameScoreResponse
    );
  }

  public sendInfoStartGame(name: string, level: number, speed: number, callback?: any) {
    this.socket.emit("infoStartGame", [name, level, speed], callback);
  }
  public sendInfoLostGame(
    name: string,
    level: number,
    speed: number,
    score: number,
    callback?: any
  ) {
    this.socket.emit("infoLostGame", [name, level, speed, score], callback);
  }

  public createSimpleGame(level: number, speed: number) {
    return new Promise<string>((resolve, reject) => {
      this.socket.emit("createSimpleGame", [level, speed], (err: Error, gameId: string) => {
        if (err) reject(err);
        resolve(gameId);
      });
    });
  }

  public publishSimpleGameState(gameId: string, grid: GameGrid) {
    const encodedGrid = encodeGrid(grid);
    this.socket.publish(`game-${gameId}`, encodedGrid);
  }
}

