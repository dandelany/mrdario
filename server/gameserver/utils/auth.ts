import * as t from "io-ts";
import { LegacyCompatSocket } from "../compat.js";
import { SocketResponder } from "./index.js";
import { respondInvalidData, validateSocketData } from "./io.js";

export const TAppAuthToken = t.type({
  id: t.string,
  name: t.string
});
export type AppAuthToken = t.TypeOf<typeof TAppAuthToken>;

interface ServerSocketWithAuth extends LegacyCompatSocket {
  authToken: any;
}

interface ServerSocketWithValidAuthToken extends LegacyCompatSocket {
  authToken: AppAuthToken;
}

export function hasAuthToken(socket: LegacyCompatSocket): socket is ServerSocketWithAuth {
  return socket.authState === socket.AUTHENTICATED && !!socket.authToken;
}

export function hasValidAuthToken(socket: LegacyCompatSocket): socket is ServerSocketWithValidAuthToken {
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

export const NOT_AUTHENTICATED_MESSAGE = "User is not authenticated - login first";

export function respondNotAuthenticated(respond: SocketResponder<any>): void {
  respond(NOT_AUTHENTICATED_MESSAGE, null);
}

export function requireAuth(
  socket: LegacyCompatSocket,
  respond: SocketResponder<any>,
  successCallback: (authToken: AppAuthToken, respond: SocketResponder<any>) => void,
  failureCallback: (respond: SocketResponder<any>) => void = respondNotAuthenticated
): void {
  if (hasValidAuthToken(socket)) {
    successCallback(socket.authToken, respond);
  } else {
    failureCallback(respond);
  }
}

export function authAndValidateRequest<RequestType, ResponseType>(
  socket: LegacyCompatSocket,
  TCodec: t.Type<RequestType>,
  successCallback: (
    data: RequestType,
    authToken: AppAuthToken,
    respond: SocketResponder<ResponseType>
  ) => void,
  failAuthCallback: (respond: SocketResponder<any>) => void = respondNotAuthenticated,
  failValidateCallback: (respond: SocketResponder<any>, message: string) => void = respondInvalidData
): (data: unknown, respond: SocketResponder<ResponseType>) => void {
  return function authAndValidHandler(data: unknown, respond: SocketResponder<ResponseType>) {
    function authSuccess(authToken: AppAuthToken) {
      function validateSuccess(data: RequestType) {
        successCallback(data, authToken, respond);
      }

      validateSocketData(data, TCodec, respond, validateSuccess, failValidateCallback);
    }

    requireAuth(socket, respond, authSuccess, failAuthCallback);
  };
}
