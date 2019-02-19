import { SCServer, SCServerSocket } from "socketcluster-server";
import {
  AppAuthToken,
  hasAuthToken,
  hasValidAuthToken, LobbyChatMessageOut,
  LobbyJoinMessage,
  LobbyLeaveMessage,
  LobbyMessageType,
  LobbyResponse, TLobbyMessage
} from "mrdario-core/lib/api/types";
import { bindSocketHandlers, EventHandlersObj, unbindSocketHandlers } from "../../utils";
import { logWithTime } from "../../utils/log";

const LOBBY_CHANNEL_NAME = 'mrdario-lobby';

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

export class LobbyModule {
  scServer: SCServer;
  state: LobbyModuleState;

  constructor(scServer: SCServer) {
    this.scServer = scServer;
    this.state = {
      lobby: {}
    };
    this.addMiddleware();
  }

  protected addMiddleware() {
    this.scServer.addMiddleware(
      this.scServer.MIDDLEWARE_PUBLISH_IN,
      (req: SCServer.PublishInRequest, next: SCServer.nextMiddlewareFunction) => {
        if (req.channel === LOBBY_CHANNEL_NAME) {
          if (!hasAuthToken(req.socket)) {
            next(new Error("Invalid LobbyMessage"));
            return;
          }
          const decoded = TLobbyMessage.decode(req.data);
          if (decoded.isRight()) {
            const value = decoded.value;
            if (value.type === LobbyMessageType.ChatIn) {
              const outMessage: LobbyChatMessageOut = {
                ...value,
                type: LobbyMessageType.ChatOut,
                userName: (req.socket.authToken as AppAuthToken).name
              };
              req.data = outMessage;
              logWithTime(`${outMessage.userName}: ${value.payload}`);
            }
            next();
          } else {
            next(new Error("Invalid LobbyMessage"));
          }
        } else {
          next();
        }
      }
    );
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

        const lobbyUsers: LobbyResponse = Object.values(this.state.lobby).map((user: ServerLobbyUser) => {
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
      if (hasValidAuthToken(socket)) {
        let error = null;
        if (socket.authToken.id in this.state.lobby) {
          this.leaveLobby(socket);
        } else {
          error = new Error("You are not in the lobby");
        }
        unbindSocketHandlers(socket, connectionState.lobbyHandlers);
        respond(error, null);
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
