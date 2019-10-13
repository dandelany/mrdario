import { SCServer, SCServerSocket } from "socketcluster-server";
import { Match } from "mrdario-core/lib/api/types/match";
import uuid from "uuid/v4";
import { SocketResponder } from "../../utils";
import { times, constant, defaults } from "lodash";
import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import {
  AppAuthToken,
  hasValidAuthToken,
  TCreateMatchRequest,
  CreateMatchRequest
} from "mrdario-core/lib/api/types";

// interface Responder<T> {
//   (error: Error | string | true, data: null): void;
//   (error: null, data: T): void;
// }
//
// function requireAuthToken(
//   socket: SCServerSocket,
//   respond: (error: string, data: null) => void
// ): AppAuthToken | null {
//   if (hasValidAuthToken(socket)) {
//     return socket.authToken;
//   } else {
//     respond("User is not authenticated - login first", null);
//     return null;
//   }
// }

function respondNotAuthenticated(respond: SocketResponder<any>) {
  respond("User is not authenticated - login first", null);
}

function requireAuth(
  socket: SCServerSocket,
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

export function createMatch(creatorId: string, options: CreateMatchRequest, playerCount = 2): Match {
  const defaultOptions = { invitationOnly: true, level: 10, baseSpeed: 15 };
  const fullOptions = defaults(options, defaultOptions);
  const { invitationOnly, level, baseSpeed } = fullOptions;
  const playerIds = [creatorId, ...times(playerCount - 1, constant(null))];

  return {
    id: uuid(),
    creatorId,
    playerCount,
    playerIds,
    invitationOnly,
    challengeToken: uuid().slice(10),
    level: times(playerCount, constant(level)),
    baseSpeed: times(playerCount, constant(baseSpeed))
    // todo state?
  };
}

export enum MatchEventType {
  CreateMatch = "CreateMatch",
  JoinMatch = "JoinMatch"
}

export class MatchModule {
  scServer: SCServer;

  constructor(scServer: SCServer) {
    this.scServer = scServer;
  }
  public handleConnect(socket: SCServerSocket) {
    // @ts-ignore
    // socket.on(MatchActionType.CreateMatch, (data: unknown, respond: SocketResponder<Match>) => {
    //   requireAuth(socket, respond, (authToken: AppAuthToken) => {
    //     validateSocketData(data, TCreateMatchRequest, respond, (request: CreateMatchRequest) => {
    //       const match: Match = createMatch(authToken.id, 2);
    //       respond(null, match);
    //     });
    //   });
    // });

    // @ts-ignore
    socket.on(
      MatchEventType.CreateMatch,
      authAndValidate<CreateMatchRequest, Match>(
        socket,
        TCreateMatchRequest,
        (request: CreateMatchRequest, authToken, respond) => {
          const match = createMatch(authToken.id, request, 2);
          console.log(match);
          respond(null, match);
        }
      )
    );
  }
}

function authAndValidate<ExpectedType, ResponseType>(
  socket: SCServerSocket,
  TCodec: t.Type<ExpectedType>,
  successCallback: (
    data: ExpectedType,
    authToken: AppAuthToken,
    respond: SocketResponder<ResponseType>
  ) => void,
  failAuthCallback: (respond: SocketResponder<any>) => void = respondNotAuthenticated,
  failValidateCallback: (respond: SocketResponder<any>, message: string) => void = respondInvalidData
): (data: unknown, respond: SocketResponder<ResponseType>) => void {
  return function authAndValidHandler(data: unknown, respond: SocketResponder<ResponseType>) {
    function authSuccess(authToken: AppAuthToken) {
      function validateSuccess(data: ExpectedType) {
        successCallback(data, authToken, respond);
      }
      validateSocketData(data, TCodec, respond, validateSuccess, failValidateCallback);
    }
    requireAuth(socket, respond, authSuccess, failAuthCallback);
  };
}

function respondInvalidData(respond: SocketResponder<any>, message: string = ""): void {
  respond(`Invalid data sent with request: ${message}`, null);
}

function validateSocketData<ExpectedType>(
  data: unknown,
  TCodec: t.Type<ExpectedType>,
  respond: SocketResponder<any>,
  successCallback: (data: ExpectedType, respond: SocketResponder<any>) => void,
  failureCallback: (respond: SocketResponder<any>, message: string) => void = respondInvalidData
): void {
  const decoded = TCodec.decode(data);
  if (decoded.isRight()) {
    successCallback(decoded.value, respond);
  } else {
    failureCallback(respond, PathReporter.report(decoded)[0]);
  }
}

// function authAndValidate<ExpectedType>(
//   socket: SCServerSocket,
//   data: unknown,
//   TCodec: t.Type<ExpectedType>,
//   respond: SocketResponder<any>,
//   successCallback: (data: ExpectedType, authToken: AppAuthToken, respond: SocketResponder<any>) => void,
//   failAuthCallback: (respond: SocketResponder<any>) => void = respondNotAuthenticated,
//   failValidateCallback: (respond: SocketResponder<any>, message: string) => void = respondInvalidData
// ) {
//   requireAuth(
//     socket,
//     respond,
//     authToken => {
//       validateSocketData(
//         data,
//         TCodec,
//         respond,
//         (data: ExpectedType) => {
//           successCallback(data, authToken, respond);
//         },
//         failValidateCallback
//       );
//     },
//     failAuthCallback
//   );
// }
