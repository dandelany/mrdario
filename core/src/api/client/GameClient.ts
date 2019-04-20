// import { partial } from "lodash";
import SyncClient from "@ircam/sync/client";
import { PathReporter } from "io-ts/lib/PathReporter";
import { create as createSocket, SCClientSocket } from "socketcluster-client";

import {
  ClientAuthenticatedUser,
  GameListItem,
  GameScoreRequest,
  GameScoreResponse,
  HighScoresResponse,
  LobbyChatMessageIn,
  LobbyChatMessageOut,
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
import { partialRight, remove, uniqBy } from "lodash";
import { encodeGrid } from "../../encoding";
import { decodeTimedActions, encodeTimedActions } from "../../encoding/action";
import { GameGrid, TimedGameActions } from "../../game";

// import { SCChannelOptions } from "sc-channel";

interface AuthToken {
  id: string;
  name: string;
}
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

const getTimeFunction = () => {
  return performance.now() / 1000;
};

export interface GameClientOptions {
  socketOptions?: SCClientSocket.ClientOptions;

  onConnecting?: (socket: SCClientSocket) => void;
  onConnect?: (
    status: SCClientSocket.ConnectStatus,
    processSubscriptions: () => void,
    socket: SCClientSocket
  ) => void;
  onConnectAbort?: (code: number, data: string | object, socket: SCClientSocket) => void;
  onDisconnect?: (code: number, data: string | object, socket: SCClientSocket) => void;
  onClose?: (code: number, data: string | object, socket: SCClientSocket) => void;
  onError?: (err: Error, socket: SCClientSocket) => void;

  onAuthenticate?: (signedAuthToken: string | null, socket: SCClientSocket) => void;
  onDeauthenticate?: (oldSignedToken: string | null, socket: SCClientSocket) => void;
  onAuthStateChange?: (stateChangeData: SCClientSocket.AuthStateChangeData, socket: SCClientSocket) => void;
  // todo handle other socket events?:
  // onRemoveAuthToken?: (oldToken: object | null, socket: SCClientSocket) => void;
  // onKickOut?: (message: string, channelName: string) => void;
  // onSubscribe?: (channelName: string, subscriptionOptions: SCChannelOptions) => void;
  // onSubscribeRequest?: (channelName: string, subscriptionOptions: SCChannelOptions) => void;
  // onSubscribeStateChange?: (stateChangeData: SCClientSocket.SubscribeStateChangeData) => void;
  // onSubscribeFail?: (err: Error, channelName: string, subscriptionOptions: SCChannelOptions) => void;
  // onUnsubscribe?: (channelName: string) => void;
}

export class GameClient {
  public socket: SCClientSocket;
  private lobbyUsers: LobbyResponse;
  private syncClient: SyncClient;

  constructor(options: GameClientOptions = {}) {
    const socket = createSocket({
      port: 8000,
      ...(options.socketOptions || {}),
      autoConnect: false
    });
    this.syncClient = new SyncClient(getTimeFunction);

    if (options.onConnecting) {
      socket.on("connecting", partialRight(options.onConnecting, socket));
    }
    if (options.onConnect) {
      socket.on("connect", partialRight(options.onConnect, socket));
    }
    if (options.onConnectAbort) {
      socket.on("connectAbort", partialRight(options.onConnectAbort, socket));
    }
    if (options.onDisconnect) {
      socket.on("disconnect", partialRight(options.onDisconnect, socket));
    }
    if (options.onClose) {
      socket.on("close", partialRight(options.onClose, socket));
    }
    if (options.onError) {
      socket.on("error", partialRight(options.onError, socket));
    }
    if (options.onAuthenticate) {
      socket.on("authenticate", partialRight(options.onAuthenticate, socket));
    }
    if (options.onDeauthenticate) {
      socket.on("deauthenticate", partialRight(options.onDeauthenticate, socket));
    }
    if (options.onAuthStateChange) {
      socket.on("authStateChange", partialRight(options.onAuthStateChange, socket));
    }
    if (options.onAuthStateChange) {
      socket.on("authStateChange", partialRight(options.onAuthStateChange, socket));
    }

    this.socket = socket;
    this.lobbyUsers = [];
  }
  public connect() {
    return new Promise<SCClientSocket>((resolve, reject) => {
      this.socket.connect();
      this.socket.on("connect", () => {
        console.log("Socket connected - OK");

        const syncSend = (pingId: number, clientPingTime: number) => {
          // const request = new Float64Array(3);
          // request[0] = 0; // this is a ping
          // request[1] = pingId;
          // request[2] = clientPingTime;
          const request = [pingId, clientPingTime];
          console.log(`[ping] - id: ${pingId}, pingTime: ${clientPingTime}`);

          this.socket.emit("sPing", request);
        };

        const syncReceive: SyncClient.ReceiveFunction = callback => {
          this.socket.on("sPong", (response: any) => {
            if (response) {
              const [pingId, clientPingTime, serverPingTime, serverPongTime] = response;

              console.log(
                `[pong] - id: %s, clientPingTime: %s, serverPingTime: %s, serverPongTime: %s`,
                pingId,
                clientPingTime,
                serverPingTime,
                serverPongTime
              );

              callback(pingId, clientPingTime, serverPingTime, serverPongTime);
            }
          });
        };

        const syncReport: SyncClient.ReportFunction = report => {
          console.log(report);
        };

        this.syncClient.start(syncSend, syncReceive, syncReport);

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
    options: {
      onChangeLobbyUsers?: (lobbyUsers: LobbyResponse) => any;
      onChatMessage?: (message: LobbyChatMessageOut) => any;
    } = {}
  ): Promise<LobbyResponse> {
    return await promisifySocketRequest<LobbyResponse>(this.socket, "joinLobby", null, TLobbyResponse).then(
      (lobbyResponse: LobbyResponse) => {
        this.lobbyUsers = lobbyResponse;
        const lobbyChannel = this.socket.subscribe("mrdario-lobby");
        lobbyChannel.watch((data: any) => {
          const decoded = TLobbyMessage.decode(data);
          if (decoded.isRight()) {
            const message: LobbyMessage = decoded.value;
            console.log("lobby channel:", message);
            if (message.type === LobbyMessageType.Join) {
              this.lobbyUsers.push(message.payload);
              this.lobbyUsers = uniqBy(this.lobbyUsers, (user: LobbyUser) => user.id);
            } else if (message.type === LobbyMessageType.Leave) {
              remove(this.lobbyUsers, (user: LobbyUser) => user.id === message.payload.id);
            } else if (message.type === LobbyMessageType.ChatOut && options.onChatMessage) {
              options.onChatMessage(message);
            }
            if (options.onChangeLobbyUsers) {
              options.onChangeLobbyUsers(this.lobbyUsers.slice());
            }
          }
        });
        console.table(lobbyResponse);
        return lobbyResponse;
      }
    );
  }

  public async leaveLobby(): Promise<null> {
    // todo have to unwatch also?
    this.socket.unsubscribe("mrdario-lobby");
    this.socket.unwatch("mrdario-lobby");
    return await promisifySocketRequest<null>(this.socket, "leaveLobby", null, t.null);
  }

  public sendLobbyChat(message: string): void {
    const chatMessage: LobbyChatMessageIn = {
      type: LobbyMessageType.ChatIn,
      payload: message
    };
    this.socket.publish("mrdario-lobby", chatMessage);
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
    return new Promise<GameListItem>((resolve, reject) => {
      this.socket.emit("createSimpleGame", [level, speed], (err: Error, game: GameListItem) => {
        if (err) {
          reject(err);
        }
        resolve(game);
      });
    });
  }

  public publishSimpleGameState(gameId: string, grid: GameGrid) {
    const encodedGrid = encodeGrid(grid);
    this.socket.publish(`game-${gameId}`, encodedGrid);
  }
  public publishSimpleGameActions(gameId: string, timedActions: TimedGameActions) {
    const encodedActions = encodeTimedActions(timedActions);
    console.log(this.syncClient.getSyncTime());
    this.socket.publish(`game-${gameId}`, encodedActions);
  }

  public watchSimpleGameMoves(gameId: string, handleMoves?: (actions: TimedGameActions) => void) {
    const gameChannel = this.socket.subscribe(`game-${gameId}`);
    gameChannel.watch((data: string) => {
      if (handleMoves) {
        handleMoves(decodeTimedActions(data));
      }
    });
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
