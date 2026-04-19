import hashUtil from "tweetnacl-util";
import nacl from "tweetnacl";
import { v4 as uuid } from "uuid";

import { AuthEventType, ClientAuthenticatedUser, LoginRequest, ServerUser, TLoginRequest } from "mrdario-core/api/auth";

import {
  AppAuthToken,
  getClientIpAddress,
  hasAuthToken,
  hasValidAuthToken,
  isAuthToken,
  logWithTime
} from "../../utils/index.js";
import { defineServerModule } from "../../runtime/types.js";

const { hash } = nacl;

type ServerUsers = { [K in string]: ServerUser };

export function createAuthModule() {
  const users: ServerUsers = {};

  return defineServerModule({
    name: "auth",
    onConnect({ connection }) {
      if (hasAuthToken(connection.socket)) {
        if (!isAuthToken(connection.socket.authToken) || !(connection.socket.authToken.id in users)) {
          connection.clearAuthToken();
        } else {
          logWithTime(`Welcome back, ${connection.socket.authToken.name}`);
        }
      }

      connection.on("disconnect", () => {
        logWithTime("Disconnected: ", getClientIpAddress(connection.socket));
        if (hasValidAuthToken(connection.socket) && connection.socket.authToken.id in users) {
          logWithTime("Goodbye, ", connection.socket.authToken.name);
          delete users[connection.socket.authToken.id].socketId;
        }
      });
    },
    procedures: [
      {
        auth: "none",
        eventType: AuthEventType.Login,
        codec: TLoginRequest,
        handler({ connection }, request: LoginRequest): ClientAuthenticatedUser {
          if (!request.name || !request.name.length) {
            throw new Error("Login requires a name");
          }

          const { id, token, name } = request;
          let clientUser: ClientAuthenticatedUser;
          if (id && token && authenticateUser(id, token, users)) {
            const serverUser = users[id];
            if (name != serverUser.name) {
              users[id].name = name;
              users[id].socketId = connection.id;
            }
            clientUser = { id, token, name };
          } else {
            const created = createUser(name);
            clientUser = created.clientUser;
            const serverUser = created.serverUser;
            users[serverUser.id] = serverUser;
            users[serverUser.id].socketId = connection.id;
          }

          const authToken: AppAuthToken = { id: clientUser.id, name: clientUser.name };
          connection.setAuthToken(authToken);
          logWithTime(`${clientUser.name} logged in. (${clientUser.id})`);
          console.table(Object.values(users));
          return clientUser;
        }
      }
    ]
  });
}

function createUser(name: string): { clientUser: ClientAuthenticatedUser; serverUser: ServerUser } {
  const id = uuid();
  const user = { name, id };
  const token = uuid().slice(-10);
  const tokenBytes = hashUtil.decodeUTF8(token);
  const tokenHashBytes = hash(tokenBytes);
  const tokenHash = hashUtil.encodeBase64(tokenHashBytes);
  return {
    clientUser: { ...user, token },
    serverUser: { ...user, tokenHash }
  };
}

function authenticateUser(id: string, token: string, users: ServerUsers) {
  if (!(id in users)) return false;
  const serverUser: ServerUser = users[id];
  const tokenHash = hashUtil.encodeBase64(hash(hashUtil.decodeUTF8(token)));
  return tokenHash === serverUser.tokenHash;
}
