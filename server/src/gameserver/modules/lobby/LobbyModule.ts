import { SCServerSocket } from "socketcluster-server";
import {
  LOBBY_CHANNEL_NAME,
  LobbyChatMessageOut,
  LobbyEventType,
  LobbyJoinMessage,
  LobbyJoinRequest,
  LobbyJoinResponse,
  LobbyLeaveMessage,
  LobbyLeaveRequest,
  LobbyLeaveResponse,
  LobbyMessageType,
  TLobbyJoinRequest,
  TLobbyLeaveRequest,
  TLobbyMessage
} from "mrdario-core/src/api/lobby";
import { AppAuthToken } from "mrdario-core/src/api/auth";

import { AbstractServerModule, makeChannelConfig, ModuleConfig, ServerModuleOptions } from "../../AbstractServerModule";
import { bindSocketHandlers, EventHandlersObj, hasAuthToken, logWithTime, unbindSocketHandlers } from "../../utils";
// import * as t from "io-ts";

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

export class LobbyModule extends AbstractServerModule {
  state: LobbyModuleState;

  static config: ModuleConfig = {
    channels: [
      makeChannelConfig(
        // TLobbyResponse
        {
          name: LOBBY_CHANNEL_NAME,
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

  constructor(options: ServerModuleOptions) {
    super(options);
    this.state = { lobby: {} };
    this.addMiddleware(LobbyModule.config.channels);
  }

  public handleConnect(socket: SCServerSocket) {
    const connectionState: LobbyModuleConnectionState = {
      lobbyHandlers: {}
    };

    this.bindListener<LobbyJoinRequest, LobbyJoinResponse>(socket, {
      eventType: LobbyEventType.Join,
      codec: TLobbyJoinRequest,
      listener: (_data, authToken, respond) => {
        const userId = authToken.id;
        const name = authToken.name;

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
          logWithTime(`${authToken.name} joined the lobby`);
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
            logWithTime(`${name} reauthenticated as ${authToken.name} - removing ${name} from lobby`);
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
      }
    });

    this.bindListener<LobbyLeaveRequest, LobbyLeaveResponse>(socket, {
      eventType: LobbyEventType.Leave,
      codec: TLobbyLeaveRequest,
      listener: (_data, authToken, respond) => {
        if (authToken.id in this.state.lobby) {
          this.leaveLobby(socket);
        } else {
          respond(new Error("You are not in the lobby"), null);
        }
        unbindSocketHandlers(socket, connectionState.lobbyHandlers);
        respond(null, null);
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
