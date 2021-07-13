// import { partial } from "lodash";
import SyncClient from "@ircam/sync/client";
import { partialRight, remove, uniqBy } from "lodash";
import { create as createSocket, SCClientSocket } from "socketcluster-client";

import {
  CreateSingleMatchRequest,
  SingleMatchInfo,
  // TCreateSingleMatchRequest,
  TSingleMatchInfo,
  //
  CreateMatchRequest,
  GameListItem,
  GetHighScoresResponse,
  Match,
  MatchEventType,
  SaveScoreRequest,
  SaveScoreResponse,
  ScoresEventType,
  TGetHighScoresResponse,
  TMatch,
  TSaveScoreResponse, UpdateSingleMatchSettingsRequest
} from "../api";

import {
  AppAuthToken,
  AuthEventType,
  ClientAuthenticatedUser,
  isAuthToken,
  LoginRequest,
  TClientAuthenticatedUser
} from "../api/auth";

import {
  LOBBY_CHANNEL_NAME,
  LobbyChatMessageIn,
  LobbyChatMessageOut,
  LobbyEventType,
  LobbyJoinResponse,
  LobbyMessage,
  LobbyMessageType,
  LobbyUser,
  TLobbyJoinResponse,
  TLobbyLeaveResponse,
  TLobbyMessage
} from "../api/lobby";

import {
  CreateSingleGameRequest,
  CreateSingleGameResponse,
  GameEventType,
  TCreateSingleGameResponse
} from "../api/game";

import { decodeTimedActions, encodeTimedActions } from "../api/game/encoding/action";
import { encodeGrid } from "../api/game/encoding/grid";
import { GameControllerMode, GameGrid, TimedGameActions, TimedMoveActions } from "../game/types";
import { promisifySocketPublish, promisifySocketRequest as emit, validatedChannel } from "./utils";
import { isRight } from "fp-ts/lib/Either";
// import { setupSyncClient } from "./SyncClient";


interface ClientSocketWithValidAuthToken extends SCClientSocket {
  authToken: AppAuthToken;
}

export function hasValidAuthToken(socket: SCClientSocket): socket is ClientSocketWithValidAuthToken {
  return !!socket.authToken && isAuthToken(socket.authToken);
}

// const getTimeFunction = () => {
//   return performance.now() / 1000;
// };

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
  private lobbyUsers: LobbyJoinResponse;
  private syncClient?: SyncClient;

  constructor(options: GameClientOptions = {}) {
    const socket = createSocket({
      port: 8000,
      ...(options.socketOptions || {}),
      autoConnect: false
    });
    // this.syncClient = new SyncClient(getTimeFunction);

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

    this.socket = socket;
    this.lobbyUsers = [];
  }

  public connect() {
    // todo handle case when connect is called after already connected
    return new Promise<SCClientSocket>((resolve, reject) => {
      this.socket.connect();
      this.socket.on("connect", () => {
        // console.log("Socket connected - OK");
        // this.syncClient = setupSyncClient(this.socket, getTimeFunction);
        resolve(this.socket);
      });
      this.socket.on("error", (err: Error) => {
        console.error("Socket error - " + err);
        reject(err);
      });
    });
  }

  public disconnect() {
    this.socket.disconnect();
  }

  /* --- AUTH  --- */
  public async login(name: string, id?: string, token?: string): Promise<ClientAuthenticatedUser> {
    return await emit<ClientAuthenticatedUser, LoginRequest>(
      this.socket,
      AuthEventType.Login,
      { name, id, token },
      TClientAuthenticatedUser
    );
  }
  /* --- END AUTH  --- */

  /* --- LOBBY  --- */
  public async joinLobby(
    options: {
      onChangeLobbyUsers?: (lobbyUsers: LobbyJoinResponse) => any;
      onChatMessage?: (message: LobbyChatMessageOut) => any;
    } = {}
  ): Promise<LobbyJoinResponse> {
    return await emit(this.socket, LobbyEventType.Join, null, TLobbyJoinResponse).then(
      (lobbyResponse: LobbyJoinResponse) => {
        console.log(lobbyResponse);
        this.lobbyUsers = lobbyResponse;
        const rawLobbyChannel = this.socket.subscribe(LOBBY_CHANNEL_NAME);
        const lobbyChannel = validatedChannel(rawLobbyChannel, TLobbyMessage);

        lobbyChannel.watch((data: LobbyMessage) => {
          const decoded = TLobbyMessage.decode(data);
          if (isRight(decoded)) {
            const message: LobbyMessage = decoded.right;
            console.log("lobby channel:", message);
            const { onChangeLobbyUsers, onChatMessage } = options;

            if (message.type === LobbyMessageType.Join) {
              this.lobbyUsers.push(message.payload);
              this.lobbyUsers = uniqBy(this.lobbyUsers, (user: LobbyUser) => user.id);
              if (onChangeLobbyUsers) { onChangeLobbyUsers(this.lobbyUsers.slice()); }
            } else if (message.type === LobbyMessageType.Leave) {
              remove(this.lobbyUsers, (user: LobbyUser) => user.id === message.payload.id);
              if (onChangeLobbyUsers) { onChangeLobbyUsers(this.lobbyUsers.slice()); }
            } else if (message.type === LobbyMessageType.ChatOut && onChatMessage) {
              console.log("call chat callback", message);
              onChatMessage(message);
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
    this.socket.unsubscribe(LOBBY_CHANNEL_NAME);
    this.socket.unwatch(LOBBY_CHANNEL_NAME);
    return await emit(this.socket, LobbyEventType.Leave, null, TLobbyLeaveResponse);
  }

  public async sendLobbyChat(message: string): Promise<undefined> {
    const chatMessage: LobbyChatMessageIn = {
      type: LobbyMessageType.ChatIn,
      payload: message
    };
    return await promisifySocketPublish(this.socket, LOBBY_CHANNEL_NAME, chatMessage);
  }
  /* --- END LOBBY  --- */

  /* --- SCORES --- */
  public async getHighScores(level: number): Promise<GetHighScoresResponse> {
    return await emit(this.socket, ScoresEventType.GetHighScores, level, TGetHighScoresResponse);
  }

  public sendSingleGameHighScore(level: number, name: string, score: number): Promise<SaveScoreResponse> {
    const request: SaveScoreRequest = [level, name, score];
    return emit(this.socket, ScoresEventType.SaveScore, request, TSaveScoreResponse);
  }
  /* --- END SCORES --- */

  /* --- MATCH --- */
  public async createMatch(options: CreateMatchRequest = {}): Promise<Match> {
    return await emit(this.socket, MatchEventType.CreateMatch, options, TMatch);
  }

  public async createSingleMatch(options: CreateSingleMatchRequest = {}): Promise<SingleMatchInfo> {
    // emit a CreateSingleMatch socket message
    return await emit(this.socket, MatchEventType.CreateSingleMatch, options, TSingleMatchInfo);
  }
  public async updateSingleMatchSettings(options: UpdateSingleMatchSettingsRequest = {}): Promise<SingleMatchInfo> {
    return await emit(this.socket, MatchEventType.UpdateSingleMatchSettings, options, TSingleMatchInfo);
  }
  /* --- END MATCH --- */



  /* --- GAME - EXPERIMENTAL/SOME OLD --- */
  public createSingleGame(level: number, baseSpeed: number): Promise<CreateSingleGameResponse> {
    return emit<CreateSingleGameResponse, CreateSingleGameRequest>(
      this.socket,
      GameEventType.CreateSingle,
      {level, baseSpeed},
      TCreateSingleGameResponse
    );
  }

  public sendSingleGameMoves(moveActions: TimedMoveActions): void {
    this.socket.emit(GameEventType.SingleMove, encodeTimedActions(moveActions));
  }
  public sendSingleGameModeChange(nextMode: GameControllerMode): void {
    this.socket.emit(GameEventType.SingleModeChange, nextMode);
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
    if (this.syncClient) {
      console.log(this.syncClient.getSyncTime());
    }
    console.log("publish", encodedActions);
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
