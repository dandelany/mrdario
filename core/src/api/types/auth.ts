import * as t from "io-ts";
import { SCServerSocket } from "socketcluster-server";

export const TAppAuthToken = t.type({
  id: t.string,
  name: t.string
});
export type AppAuthToken = t.TypeOf<typeof TAppAuthToken>;


interface ServerSocketWithAuth extends SCServerSocket {
  authToken: any;
}

interface ServerSocketWithValidAuthToken extends SCServerSocket {
  authToken: AppAuthToken;
}

export function hasAuthToken(socket: SCServerSocket): socket is ServerSocketWithAuth {
  return socket.authState === socket.AUTHENTICATED && !!socket.authToken;
}

export function hasValidAuthToken(socket: SCServerSocket): socket is ServerSocketWithValidAuthToken {
  return hasAuthToken(socket) && isAuthToken(socket.authToken);
}

export function isAuthToken(authToken?: { [K in string]: any } | null): authToken is AppAuthToken {
  return (
    !!authToken &&
    typeof authToken.id === "string" &&
    !!authToken.id.length &&
    typeof authToken.name === "string"
  );
}
