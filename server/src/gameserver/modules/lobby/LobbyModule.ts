import { SCServer, SCServerSocket } from "socketcluster-server";
import {
  AppAuthToken
} from "mrdario-core/lib/api/auth";


import * as t from "io-ts";

import {
  bindSocketHandlers,
  EventHandlersObj,
  hasAuthToken,
  hasValidAuthToken,
  logWithTime,
  unbindSocketHandlers
} from "../../utils";
import {
  PublishOutMiddlewareWithDataType,
  PublishOutRequestWithDataType,
  requireAuthMiddleware,
  validateChannelRequest,
  ValidatedChannelMiddlewareConfig,
  ValidatedPublishInMiddleware
} from "../../utils/middleware";

import {
  LOBBY_CHANNEL_NAME,
  LobbyChatMessageOut,
  LobbyJoinMessage,
  LobbyLeaveMessage,
  LobbyMessageType,
  LobbyJoinResponse,
  TLobbyMessage
} from "mrdario-core/lib/api/lobby";

// export type ExtractGeneric<T> = T extends any<infer R> ? true : never;

// type ChainablePubInMiddleware = PrependParameter<PublishInMiddleware, (...args: any) => any>;

type ServerLobbyUser = {
  name: string;
  id: string;
  joined: number;
  sockets: string[];
};

interface LobbyModuleState {
  lobby: { [K in string]: ServerLobbyUser };
}
interface LobbyModuleConnectionState {
  lobbyHandlers: EventHandlersObj;
}

type ModuleConfig = {
  channels: ModuleChannelConfig<any>[];
};

type ModuleChannelConfig<DataType> = {
  match: string; // todo allow regex and match function
  requireAuth: boolean;
  messageCodec: t.Type<DataType>;
  middlewares?: ValidatedChannelMiddlewareConfig<DataType>[];
  publishInMiddleware?: ValidatedPublishInMiddleware<DataType>;
  publishOutMiddleware?: PublishOutMiddlewareWithDataType<DataType>;
  // middleware: PublishInMiddleware<DataType>;
};

// the only way i can figure out to infer Datatype from the codec type
function makeChannelConfig<DataType>(
  // codec: t.Type<DataType>,
  config: ModuleChannelConfig<DataType>
): ModuleChannelConfig<DataType> {
  return config;
}

export class LobbyModule {
  scServer: SCServer;
  state: LobbyModuleState;

  static config: ModuleConfig = {
    channels: [
      makeChannelConfig(
        // TLobbyResponse
        {
          match: LOBBY_CHANNEL_NAME,
          requireAuth: true,
          messageCodec: TLobbyMessage,
          publishInMiddleware: (req, next) => {
            console.log("lobby publish in");
            console.log(req.data);
            console.log(req.validData);

            const message = req.validData;

            if (message.type === LobbyMessageType.ChatIn) {
              const outMessage: LobbyChatMessageOut = {
                ...message,
                type: LobbyMessageType.ChatOut,
                // todo figure out typing for this so we don't use `as`
                userName: (req.socket.authToken as AppAuthToken).name
              };
              req.data = outMessage;
              logWithTime(`${outMessage.userName}: ${message.payload}`);
            }

            next();
          },
          publishOutMiddleware: (req, next) => {
            console.log("lobby publish out");

            console.log(req.data);

            if (req.data.type === LobbyMessageType.Join) {
              console.log("joined", req.data.payload.name);
            }
            next();
          }
        }
      )
    ]
  };

  constructor(scServer: SCServer) {
    this.scServer = scServer;
    this.state = {
      lobby: {}
    };
    this.addMiddleware();
  }

  protected addMiddleware() {
    LobbyModule.config.channels.forEach(channelConfig => {
      // const chainedPubInMiddleware = chainMiddleware<PublishInRequest>([
      //   (req, _next, end) => {
      //     if (req.channel !== LOBBY_CHANNEL_NAME) end();
      //   },
      //   requireAuthMiddleware,
      //   getValidateMiddleware(TLobbyMessage)
      // ])
      const { messageCodec, publishInMiddleware } = channelConfig;
      this.scServer.addMiddleware(this.scServer.MIDDLEWARE_PUBLISH_IN, (req, next) => {
        if (req.channel === channelConfig.match) {
          requireAuthMiddleware(req, (e?: string | true | Error | undefined) => {
            if (e) next(e);
            else {
              validateChannelRequest(
                req,
                messageCodec,
                validReq => {
                  if (publishInMiddleware) publishInMiddleware(validReq, next);
                  else next();
                },
                (e: Error) => next(e)
              );
            }
          });
        } else {
          next();
        }
      });

      if (channelConfig.publishOutMiddleware) {
        const { publishOutMiddleware } = channelConfig;

        this.scServer.addMiddleware(this.scServer.MIDDLEWARE_PUBLISH_OUT, (req, next) => {
          publishOutMiddleware(req as PublishOutRequestWithDataType<t.TypeOf<typeof messageCodec>>, next);
        });
      }
    });
  }

  public handleConnect(socket: SCServerSocket) {
    const connectionState: LobbyModuleConnectionState = {
      lobbyHandlers: {}
    };

    // @ts-ignore
    socket.on("joinLobby", (data: null, respond: (err: Error | null, data: Lobby | null) => any) => {
      if (hasValidAuthToken(socket)) {
        const userId = socket.authToken.id;
        const name = socket.authToken.name;

        if (userId in this.state.lobby) {
          // user already in lobby
          const lobbyUser = this.state.lobby[userId];
          if (lobbyUser.sockets.indexOf(socket.id) >= 0) {
            logWithTime(`${name} tried to re-join the lobby on the same socket`);
            // todo dont return error?
            respond(new Error("You are already in the lobby"), null);
            return;
          } else {
            // add socket to existing lobby user
            lobbyUser.sockets.push(socket.id);
            logWithTime(`${name} joined the lobby in another socket`);
          }
        } else {
          // user not in lobby - join
          const lobbyUser: ServerLobbyUser = {
            name,
            id: userId,
            joined: Date.now(),
            sockets: [socket.id]
          };
          this.state.lobby[userId] = lobbyUser;
          const message: LobbyJoinMessage = {
            type: LobbyMessageType.Join,
            payload: { name: name, id: userId, joined: lobbyUser.joined }
          };
          this.scServer.exchange.publish(LOBBY_CHANNEL_NAME, message, () => {});
          logWithTime(`${socket.authToken.name} joined the lobby`);
        }

        //shouldn't have any, but unbind old handlers to be safe
        unbindSocketHandlers(socket, connectionState.lobbyHandlers);
        connectionState.lobbyHandlers = {
          disconnect: () => {
            this.leaveLobby(socket);
          },
          authenticate: () => {
            // if user authenticates as a new user, old user should leave lobby
            // todo new user should re-enter lobby too?
            logWithTime(`${name} reauthenticated as ${socket.authToken.name} - removing ${name} from lobby`);
            this.leaveLobby(socket);
          }
        };
        bindSocketHandlers(socket, connectionState.lobbyHandlers);

        const lobbyUsers: LobbyJoinResponse = Object.values(this.state.lobby).map((user: ServerLobbyUser) => {
          const { id, name, joined } = user;
          return { id, name, joined };
        });
        console.table(this.state.lobby);

        respond(null, lobbyUsers);
      } else {
        respond(new Error("User is not authenticated - login first"), null);
      }
    });

    // @ts-ignore
    socket.on("leaveLobby", (_data: null, respond: (err: Error | null, data: null) => any) => {
      console.log('got leaveLobby');
      if (hasValidAuthToken(socket)) {
        let error = null;
        if (socket.authToken.id in this.state.lobby) {
          this.leaveLobby(socket);
        } else {
          error = new Error("You are not in the lobby");
        }
        unbindSocketHandlers(socket, connectionState.lobbyHandlers);
        respond(error, null);
      } else {
        respond(new Error("User is not authenticated - login first"), null);
      }
    });
  }

  protected leaveLobby(socket: SCServerSocket): void {
    const { lobby } = this.state;
    if (hasAuthToken(socket)) {
      const { authToken } = socket;
      const { id: userId, name } = authToken;
      if (authToken.id in lobby) {
        const user: ServerLobbyUser = lobby[userId];
        const sockets: string[] = user.sockets;
        const index = sockets.indexOf(socket.id);
        if (index >= 0) {
          sockets.splice(index, 1);
        }
        if (sockets.length === 0) {
          delete lobby[userId];
          const message: LobbyLeaveMessage = {
            type: LobbyMessageType.Leave,
            payload: { name: user.name, id: user.id, joined: user.joined }
          };
          this.scServer.exchange.publish(LOBBY_CHANNEL_NAME, message, () => {});
          logWithTime(`${name} left the lobby`);
          console.table(lobby);
        }
      }
    }
  }
}
