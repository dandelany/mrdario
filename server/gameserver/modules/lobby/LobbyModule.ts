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
} from "mrdario-core/api/lobby";

import { bindSocketHandlers, EventHandlersObj, logWithTime, unbindSocketHandlers } from "../../utils/index.js";
import { defineServerModule } from "../../runtime/types.js";
import type { AuthenticatedModuleContext, ClientConnection, ServerServices } from "../../runtime/types.js";

type ServerLobbyUser = {
  name: string;
  id: string;
  joined: number;
  sockets: string[];
};

interface LobbyState {
  lobby: { [K in string]: ServerLobbyUser };
}

const state: LobbyState = {
  lobby: {}
};

// per-connection lifecycle handlers used to keep lobby membership in sync with disconnect/reauth.
const connectionHandlers = new Map<string, EventHandlersObj>();

function getLobbyUsers(): LobbyJoinResponse {
  return Object.values(state.lobby).map(user => {
    const { id, name, joined } = user;
    return { id, name, joined };
  });
}

function unbindLobbyHandlers(connection: ClientConnection): void {
  const handlers = connectionHandlers.get(connection.id);
  if (!handlers) return;
  unbindSocketHandlers(connection.socket, handlers);
  connectionHandlers.delete(connection.id);
}

function leaveLobby(connection: ClientConnection, services: ServerServices): void {
  const authToken = connection.authToken;
  if (!authToken) return;

  const user = state.lobby[authToken.id];
  if (!user) return;

  const socketIds = user.sockets;
  const index = socketIds.indexOf(connection.id);
  if (index >= 0) {
    socketIds.splice(index, 1);
  }

  if (socketIds.length === 0) {
    // only broadcast a real leave once the user's last socket leaves.
    delete state.lobby[authToken.id];
    const message: LobbyLeaveMessage = {
      type: LobbyMessageType.Leave,
      payload: { name: user.name, id: user.id, joined: user.joined }
    };
    void services.transport.publish(LOBBY_CHANNEL_NAME, message);
    logWithTime(`${authToken.name} left the lobby`);
    console.table(state.lobby);
  }
}

function bindLobbyHandlers(ctx: AuthenticatedModuleContext): void {
  const { connection, authToken } = ctx;
  unbindLobbyHandlers(connection);

  const handlers: EventHandlersObj = {
    disconnect: () => {
      leaveLobby(connection, ctx.services);
      unbindLobbyHandlers(connection);
    },
    authenticate: () => {
      // if this socket authenticates as a different user, the old user should leave the lobby.
      logWithTime(`${authToken.name} reauthenticated - removing ${authToken.name} from lobby`);
      leaveLobby(connection, ctx.services);
      unbindLobbyHandlers(connection);
    }
  };

  bindSocketHandlers(connection.socket, handlers);
  connectionHandlers.set(connection.id, handlers);
}

export function createLobbyModule() {
  return defineServerModule({
    name: "lobby",
    procedures: [
      {
        eventType: LobbyEventType.Join,
        auth: "required",
        codec: TLobbyJoinRequest,
        handler: async (ctx: AuthenticatedModuleContext, _data: LobbyJoinRequest): Promise<LobbyJoinResponse> => {
          const { connection, authToken } = ctx;
          const userId = authToken.id;
          const name = authToken.name;

          if (userId in state.lobby) {
            // same user can have multiple sockets in the lobby; duplicate join on the same socket is rejected.
            const lobbyUser = state.lobby[userId];
            if (lobbyUser.sockets.includes(connection.id)) {
              logWithTime(`${name} tried to re-join the lobby on the same socket`);
              throw new Error("you are already in the lobby");
            }
            lobbyUser.sockets.push(connection.id);
            logWithTime(`${name} joined the lobby in another socket`);
          } else {
            // first socket for this user entering the lobby.
            const lobbyUser: ServerLobbyUser = {
              name,
              id: userId,
              joined: Date.now(),
              sockets: [connection.id]
            };
            state.lobby[userId] = lobbyUser;
            const message: LobbyJoinMessage = {
              type: LobbyMessageType.Join,
              payload: { name, id: userId, joined: lobbyUser.joined }
            };
            await ctx.services.transport.publish(LOBBY_CHANNEL_NAME, message);
            logWithTime(`${name} joined the lobby`);
          }

          bindLobbyHandlers(ctx);
          console.table(state.lobby);
          return getLobbyUsers();
        }
      },
      {
        eventType: LobbyEventType.Leave,
        auth: "required",
        codec: TLobbyLeaveRequest,
        handler: async (ctx: AuthenticatedModuleContext, _data: LobbyLeaveRequest): Promise<LobbyLeaveResponse> => {
          const authToken = ctx.authToken;
          if (!(authToken.id in state.lobby)) {
            throw new Error("you are not in the lobby");
          }

          leaveLobby(ctx.connection, ctx.services);
          unbindLobbyHandlers(ctx.connection);
          return null;
        }
      }
    ],
    topics: [
      {
        name: LOBBY_CHANNEL_NAME,
        auth: "required",
        codec: TLobbyMessage,
        onPublishIn: async (ctx: AuthenticatedModuleContext, message) => {
          // chat-in is rewritten to chat-out on the server so the author name comes from auth state,
          // not client-provided payload.
          if (message.type !== LobbyMessageType.ChatIn) {
            return message;
          }

          const outMessage: LobbyChatMessageOut = {
            ...message,
            type: LobbyMessageType.ChatOut,
            userName: ctx.authToken.name
          };
          logWithTime(`${outMessage.userName}: ${message.payload}`);
          return outMessage;
        },
        onPublishOut: async (_ctx, message) => {
          if (message.type === LobbyMessageType.Join) {
            console.log("joined", message.payload.name);
          }
        }
      }
    ]
  });
}
