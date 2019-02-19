import { SCServer, SCServerSocket } from "socketcluster-server";
import {
  AppAuthToken,
  ClientAuthenticatedUser,
  hasAuthToken,
  hasValidAuthToken,
  isAuthToken,
  LoginRequest,
  ServerUser
} from "mrdario-core/lib/api/types";
import { logWithTime } from "../../utils/log";
import { getClientIpAddress } from "../../utils";
import uuid from "uuid/v4";
import hashUtil from "tweetnacl-util";
import { hash } from "tweetnacl";

type ServerUsers = { [K in string]: ServerUser };

interface AuthModuleState {
  users: ServerUsers;
}

export class AuthModule {
  scServer: SCServer;
  state: AuthModuleState;

  constructor(scServer: SCServer) {
    this.scServer = scServer;
    this.state = {
      users: {}
    };
  }
  public handleConnect(socket: SCServerSocket) {
    if (hasAuthToken(socket)) {
      // revoke auth token if badly formatted, or if user is not in users collection
      if (!isAuthToken(socket.authToken) || !(socket.authToken.id in this.state.users)) {
        socket.deauthenticate();
      } else {
        logWithTime(`Welcome back, ${socket.authToken.name}`);
      }
    }

    socket.on("disconnect", () => {
      logWithTime("Disconnected: ", getClientIpAddress(socket));
      if (hasValidAuthToken(socket) && socket.authToken.id in this.state.users) {
        logWithTime("Goodbye, ", socket.authToken.name);
        delete this.state.users[socket.authToken.id].socketId;
      }
    });

    socket.on(
      // @ts-ignore
      "login",
      (request: LoginRequest, respond: (err: Error | null, data: ClientAuthenticatedUser) => any): void => {
        const { id, token, name } = request;

        let clientUser: ClientAuthenticatedUser;
        if (id && token && authenticateUser(id, token, this.state.users)) {
          // user is authenticated
          // allow setting name at login
          const serverUser = this.state.users[id];
          if (name != serverUser.name) {
            this.state.users[id].name = name;
            this.state.users[id].socketId = socket.id;
          }
          clientUser = { id, token, name };
        } else {
          // authentication failed,
          // or no id/token provided, create a new user
          const created = createUser(name);
          clientUser = created.clientUser;
          const serverUser = created.serverUser;
          this.state.users[serverUser.id] = serverUser;
          this.state.users[serverUser.id].socketId = socket.id;
        }
        respond(null, clientUser);
        const authToken: AppAuthToken = { id: clientUser.id, name: clientUser.name };
        socket.setAuthToken(authToken);
        logWithTime(`${clientUser.name} logged in. (${clientUser.id})`);
        console.table(Object.values(this.state.users));
      }
    );
  }
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
