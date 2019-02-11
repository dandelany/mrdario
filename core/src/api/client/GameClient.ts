// import { partial } from "lodash";
import { PathReporter } from "io-ts/lib/PathReporter";
import { create as createSocket, SCClientSocket } from "socketcluster-client";
import {
  ClientAuthenticatedUser,
  GameScoreRequest,
  GameScoreResponse,
  HighScoresResponse,
  LobbyMessage,
  LobbyMessageType,
  LobbyResponse,
  LobbyUser,
  LoginRequest,
  TClientAuthenticatedUser,
  TGameScoreResponse,
  THighScoresResponse,
  TLobbyMessage,
  TLobbyResponse
} from "../types";

import * as t from "io-ts";
import { encodeGrid } from "../../encoding";
import { GameGrid } from "../../game";
import { partialRight, remove } from "lodash";

// import { SCChannelOptions } from "sc-channel";

type AuthToken = {
  id: string;
  name: string;
};
interface ClientSocketWithValidAuthToken extends SCClientSocket {
  authToken: AuthToken;
}
function isAuthToken(authToken?: { [K in string]: any }): authToken is AuthToken {
  return (
    !!authToken &&
    typeof authToken.id === "string" &&
    !!authToken.id.length &&
    typeof authToken.name === "string"
  );
}

export function hasValidAuthToken(socket: SCClientSocket): socket is ClientSocketWithValidAuthToken {
  return !!socket.authToken && isAuthToken(socket.authToken);
}

export interface GameClientOptions {
  socketOptions?: SCClientSocket.ClientOptions;

  onConnecting?: () => void;
  onConnect?: (status: SCClientSocket.ConnectStatus, processSubscriptions: () => void) => void;
  onConnectAbort?: (code: number, data: string | object) => void;
  onDisconnect?: (code: number, data: string | object) => void;
  onClose?: (code: number, data: string | object) => void;
  onError?: (err: Error) => void;

  // onKickOut?: (message: string, channelName: string) => void;
  // onAuthenticate?: (signedAuthToken: string | null) => void;
  // onDeauthenticate?: (oldSignedToken: string | null) => void;
  // onAuthStateChange?: (stateChangeData: SCClientSocket.AuthStateChangeData) => void;
  // onRemoveAuthToken?: (oldToken: object | null) => void;
  // onSubscribe?: (channelName: string, subscriptionOptions: SCChannelOptions) => void;
  // onSubscribeRequest?: (channelName: string, subscriptionOptions: SCChannelOptions) => void;
  // onSubscribeStateChange?: (stateChangeData: SCClientSocket.SubscribeStateChangeData) => void;
  // onSubscribeFail?: (err: Error, channelName: string, subscriptionOptions: SCChannelOptions) => void;
  // onUnsubscribe?: (channelName: string) => void;
  // onRaw?: (data: any) => void;
  // onMessage?: (message: WebSocket.Data) => void;
}

export class GameClient {
  public socket: SCClientSocket;
  private lobbyUsers: LobbyResponse;

  constructor(options: GameClientOptions = {}) {
    const socket = createSocket({
      port: 8000,
      ...(options.socketOptions || {}),
      autoConnect: false
    });

    if (options.onConnecting) socket.on("connecting", partialRight(options.onConnecting, socket));
    if (options.onConnect) socket.on("connect", partialRight(options.onConnect, socket));
    if (options.onConnectAbort) socket.on("connectAbort", partialRight(options.onConnectAbort, socket));
    if (options.onDisconnect) socket.on("disconnect", partialRight(options.onDisconnect, socket));
    if (options.onClose) socket.on("close", partialRight(options.onClose, socket));
    if (options.onError) socket.on("error", partialRight(options.onError, socket));

    this.socket = socket;
    this.lobbyUsers = [];
  }
  public connect() {
    return new Promise<SCClientSocket>((resolve, reject) => {
      this.socket.connect();
      this.socket.on("connect", () => {
        console.log("Socket connected - OK");
        resolve(this.socket);
      });
      this.socket.on("error", (err: Error) => {
        console.error("Socket error - " + err);
        reject(err);
      });
    });
  }

  public async login(name: string, id?: string, token?: string): Promise<ClientAuthenticatedUser> {
    return await promisifySocketRequest<ClientAuthenticatedUser, LoginRequest>(
      this.socket,
      "login",
      { name, id, token },
      TClientAuthenticatedUser
    );
  }

  public async joinLobby(
    options: { onChangeLobbyUsers?: (lobbyUsers: LobbyResponse) => any } = {}
  ): Promise<LobbyResponse> {
    return await promisifySocketRequest<LobbyResponse>(this.socket, "joinLobby", null, TLobbyResponse).then(
      (lobby: LobbyResponse) => {
        const lobbyChannel = this.socket.subscribe("mrdario-lobby");
        lobbyChannel.watch((data: any) => {
          const decoded = TLobbyMessage.decode(data);
          if (decoded.isRight()) {
            const message: LobbyMessage = decoded.value;
            console.log("lobby channel:", message);
            console.log(this.lobbyUsers);
            if (message.type === LobbyMessageType.Join) {
              this.lobbyUsers.push(message.payload);
            } else if (message.type === LobbyMessageType.Leave) {
              remove(this.lobbyUsers, (user: LobbyUser) => user.id === message.payload.id);
            }
            if(options.onChangeLobbyUsers) {
              options.onChangeLobbyUsers(this.lobbyUsers.slice());
            }
          }
          console.log(this.lobbyUsers);
        });
        return lobby;
      }
    );
  }

  public async leaveLobby(): Promise<null> {
    //todo have to unwatch also?
    this.socket.unsubscribe("mrdario-lobby");
    return await promisifySocketRequest<null>(this.socket, "leaveLobby", null, t.null);
  }

  public async getHighScores(level: number): Promise<HighScoresResponse> {
    return await promisifySocketRequest<HighScoresResponse>(
      this.socket,
      "getSingleHighScores",
      level,
      THighScoresResponse
    );
  }

  public sendSingleGameHighScore(level: number, name: string, score: number): Promise<GameScoreResponse> {
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
  public sendInfoLostGame(name: string, level: number, speed: number, score: number, callback?: any) {
    this.socket.emit("infoLostGame", [name, level, speed, score], callback);
  }

  public createSimpleGame(level: number, speed: number) {
    return new Promise<string>((resolve, reject) => {
      this.socket.emit("createSimpleGame", [level, speed], (err: Error, gameId: string) => {
        if (err) {
          reject(err);
        }
        resolve(gameId);
      });
    });
  }

  public publishSimpleGameState(gameId: string, grid: GameGrid) {
    const encodedGrid = encodeGrid(grid);
    this.socket.publish(`game-${gameId}`, encodedGrid);
  }

  public ping(): Promise<number> {
    const start = performance.now();
    return new Promise<number>((resolve, reject) => {
      this.socket.emit("ping", null, (err: Error) => {
        if (err) {
          reject(err);
        }
        resolve(performance.now() - start);
      });
    });
  }
}

async function promisifySocketRequest<ResponseType, RequestType = any>(
  socket: SCClientSocket,
  eventName: string,
  requestData: RequestType,
  TResponseType: t.Any
): Promise<ResponseType> {
  return await new Promise<ResponseType>(function(resolve, reject) {
    socket.emit(eventName, requestData, (err: Error, data: any) => {
      if (err) {
        reject(err);
      }
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
