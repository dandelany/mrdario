// import { partial } from "lodash";
import SyncClient from "@ircam/sync/client";
import lodash from "lodash";
import { create as createSocket, SCClientSocket } from "socketcluster-client";

import {
  CreateSingleMatchRequest,
  SingleMatchInfo,
  // TCreateSingleMatchRequest,
  TSingleMatchInfo,
  //
  // CreateMatchRequest,
  GameListItem,
  GetHighScoresResponse,
  // Match,
  MatchEventType,
  SaveScoreRequest,
  SaveScoreResponse,
  ScoresEventType,
  TGetHighScoresResponse,
  // TMatch,
  TSaveScoreResponse,
  UpdateMatchSettingsRequest,
} from "../api/index.js";

const { remove, uniqBy } = lodash;

import {
  AppAuthToken,
  AuthEventType,
  ClientAuthenticatedUser,
  isAuthToken,
  LoginRequest,
  TClientAuthenticatedUser,
} from "../api/auth/index.js";

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
  TLobbyMessage,
} from "../api/lobby/index.js";

import {
  CreateSingleGameRequest,
  CreateSingleGameResponse,
  GameEventType,
  TCreateSingleGameResponse,
} from "../api/game/index.js";

import { decodeTimedActions, encodeTimedActions } from "../api/game/encoding/action.js";
import { encodeGrid } from "../api/game/encoding/grid.js";
import { GameControllerMode, GameGrid, TimedGameActions, TimedMoveActions } from "../game/types/index.js";
import { promisifySocketPublish, promisifySocketRequest as emit, validatedChannel } from "./utils.js";
import { isRight } from "fp-ts/lib/Either.js";
// import { SaferClientChannelOut } from "../game/controller/3/SaferChannels2.js";
// import { setupSyncClient } from "./SyncClient.js";

interface ClientSocketWithValidAuthToken extends SCClientSocket {
  authToken: AppAuthToken;
}

type SocketEventName =
  | "connecting"
  | "connect"
  | "connectAbort"
  | "disconnect"
  | "close"
  | "error"
  | "authenticate"
  | "deauthenticate"
  | "authStateChange";

function getEventError(event: any): Error {
  if (event instanceof Error) return event;
  if (event?.error instanceof Error) return event.error;
  if (typeof event?.error === "string") return new Error(event.error);
  if (typeof event?.reason === "string") return new Error(event.reason);
  return new Error("socketcluster event failed");
}

function listenToSocketEvent(socket: SCClientSocket, eventName: SocketEventName, handler: (event: any) => void) {
  void (async () => {
    for await (const event of socket.listener(eventName)) {
      handler(event);
    }
  })();
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
      autoConnect: false,
    });
    // this.syncClient = new SyncClient(getTimeFunction);

    if (options.onConnecting) {
      listenToSocketEvent(socket, "connecting", () => options.onConnecting!(socket));
    }
    if (options.onConnect) {
      listenToSocketEvent(socket, "connect", (status: any) => options.onConnect!(status, () => {}, socket));
    }
    if (options.onConnectAbort) {
      listenToSocketEvent(socket, "connectAbort", (event: any) =>
        options.onConnectAbort!(event?.code, event?.reason ?? event, socket)
      );
    }
    if (options.onDisconnect) {
      listenToSocketEvent(socket, "disconnect", (event: any) =>
        options.onDisconnect!(event?.code, event?.reason ?? event, socket)
      );
    }
    if (options.onClose) {
      listenToSocketEvent(socket, "close", (event: any) =>
        options.onClose!(event?.code, event?.reason ?? event, socket)
      );
    }
    if (options.onError) {
      listenToSocketEvent(socket, "error", (event: any) => options.onError!(getEventError(event), socket));
    }
    if (options.onAuthenticate) {
      listenToSocketEvent(socket, "authenticate", () => options.onAuthenticate!(socket.signedAuthToken ?? null, socket));
    }
    if (options.onDeauthenticate) {
      listenToSocketEvent(socket, "deauthenticate", (event: any) =>
        options.onDeauthenticate!(event?.oldSignedAuthToken ?? event?.oldAuthToken ?? null, socket)
      );
    }
    if (options.onAuthStateChange) {
      listenToSocketEvent(socket, "authStateChange", (event: any) => options.onAuthStateChange!(event, socket));
    }

    this.socket = socket;
    this.lobbyUsers = [];
  }

  public connect() {
    // todo handle case when connect is called after already connected
    return new Promise<SCClientSocket>((resolve, reject) => {
      void this.socket.listener("connect").once().then(() => resolve(this.socket));
      void this.socket.listener("error").once().then(event => reject(getEventError(event)));
      void this.socket.listener("connectAbort").once().then(event => reject(getEventError(event)));
      this.socket.connect();
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
              if (onChangeLobbyUsers) {
                onChangeLobbyUsers(this.lobbyUsers.slice());
              }
            } else if (message.type === LobbyMessageType.Leave) {
              remove(this.lobbyUsers, (user: LobbyUser) => user.id === message.payload.id);
              if (onChangeLobbyUsers) {
                onChangeLobbyUsers(this.lobbyUsers.slice());
              }
            } else if (message.type === LobbyMessageType.ChatOut && onChatMessage) {
              console.log("call chat callback", message);
              onChatMessage(message);
            }
          }
        });

        // // hack to test saferchannels
        // const channelOut = new SaferClientChannelOut({
        //   socket: this.socket,
        //   channelName: 'test-out-1'
        // });
        // setInterval(() => {
        //   channelOut.publish(String(Date.now()));
        // }, 2000);

        console.table(lobbyResponse);
        return lobbyResponse;
      }
    );
  }

  public async leaveLobby(): Promise<null> {
    this.socket.channel(LOBBY_CHANNEL_NAME).close?.();
    this.socket.unsubscribe(LOBBY_CHANNEL_NAME);
    return await emit(this.socket, LobbyEventType.Leave, null, TLobbyLeaveResponse);
  }

  public async sendLobbyChat(message: string): Promise<undefined> {
    const chatMessage: LobbyChatMessageIn = {
      type: LobbyMessageType.ChatIn,
      payload: message,
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
  // public async createMatch(options: CreateMatchRequest = {}): Promise<Match> {
  //   return await emit(this.socket, MatchEventType.CreateMatch, options, TMatch);
  // }

  public async createMatch(options: CreateSingleMatchRequest = {}): Promise<SingleMatchInfo> {
    // emit a CreateSingleMatch socket message
    return await emit(this.socket, MatchEventType.CreateSingleMatch, options, TSingleMatchInfo);
  }
  public async updateMatchSettings(
    options: UpdateMatchSettingsRequest
  ): Promise<SingleMatchInfo> {
    return await emit(this.socket, MatchEventType.UpdateMatchSettings, options, TSingleMatchInfo);
  }
  public async getMatch(id: string): Promise<SingleMatchInfo> {
    return await emit(this.socket, MatchEventType.GetMatch, id, TSingleMatchInfo);
  }

  /* --- END MATCH --- */

  /* --- GAME - EXPERIMENTAL/SOME OLD --- */
  public createSingleGame(level: number, baseSpeed: number): Promise<CreateSingleGameResponse> {
    return emit<CreateSingleGameResponse, CreateSingleGameRequest>(
      this.socket,
      GameEventType.CreateSingle,
      { level, baseSpeed },
      TCreateSingleGameResponse
    );
  }

  public sendSingleGameMoves(moveActions: TimedMoveActions): void {
    this.socket.transmit(GameEventType.SingleMove, encodeTimedActions(moveActions));
  }
  public sendSingleGameModeChange(nextMode: GameControllerMode): void {
    this.socket.transmit(GameEventType.SingleModeChange, nextMode);
  }

  public sendInfoStartGame(name: string, level: number, speed: number, callback?: any) {
    if (callback) {
      void this.socket.invoke("infoStartGame", [name, level, speed]).then(callback);
    } else {
      this.socket.transmit("infoStartGame", [name, level, speed]);
    }
  }
  public sendInfoLostGame(name: string, level: number, speed: number, score: number, callback?: any) {
    if (callback) {
      void this.socket.invoke("infoLostGame", [name, level, speed, score]).then(callback);
    } else {
      this.socket.transmit("infoLostGame", [name, level, speed, score]);
    }
  }

  public createSimpleGame(level: number, speed: number) {
    return this.socket.invoke("createSimpleGame", [level, speed]) as Promise<GameListItem>;
  }

  public publishSimpleGameState(gameId: string, grid: GameGrid) {
    const encodedGrid = encodeGrid(grid);
    this.socket.transmitPublish(`game-${gameId}`, encodedGrid);
  }
  public publishSimpleGameActions(gameId: string, timedActions: TimedGameActions) {
    const encodedActions = encodeTimedActions(timedActions);
    if (this.syncClient) {
      console.log(this.syncClient.getSyncTime());
    }
    console.log("publish", encodedActions);
    this.socket.transmitPublish(`game-${gameId}`, encodedActions);
  }

  public watchSimpleGameMoves(gameId: string, handleMoves?: (actions: TimedGameActions) => void) {
    const gameChannel = this.socket.subscribe(`game-${gameId}`);
    void (async () => {
      for await (const data of gameChannel) {
        if (handleMoves) {
          handleMoves(decodeTimedActions(data as string));
        }
      }
    })();
  }

  public ping(): Promise<number> {
    const start = performance.now();
    return this.socket.invoke("ping", null).then(() => performance.now() - start);
  }
}
