import { constant, defaults, times } from "lodash";
import { SCServer, SCServerSocket } from "socketcluster-server";
import { v4 as uuid } from "uuid";

import {
  CreateMatchRequest,
  CreateSingleMatchRequest,
  Match,
  MatchEventType,
  MatchMode,
  SingleMatchInfo,
  TCreateMatchRequest,
  TCreateSingleMatchRequest
} from "mrdario-core/src/api/match";


import { authAndValidateRequest } from "../../utils";

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

function createSingleMatch(creatorId: string, options: CreateSingleMatchRequest): SingleMatchInfo {
  const defaultOptions = { isPublic: true, level: 10, baseSpeed: 15 };
  const fullOptions = defaults(options, defaultOptions);
  const { isPublic, level, baseSpeed } = fullOptions;
  return {
    id: uuid(),
    creatorId,
    playerIds: [creatorId],
    isPublic,
    level,
    baseSpeed,
    mode: MatchMode.Setup
  };
}

export class MatchModule {
  scServer: SCServer;

  constructor(scServer: SCServer) {
    this.scServer = scServer;
  }
  public handleConnect(socket: SCServerSocket) {
    // @ts-ignore
    socket.on(
      MatchEventType.CreateMatch,
      authAndValidateRequest<CreateMatchRequest, Match>(
        socket,
        TCreateMatchRequest,
        (request: CreateMatchRequest, authToken, respond) => {
          const match = createMatch(authToken.id, request, 2);
          console.log(match);
          respond(null, match);
        }
      )
    );

    socket.on(
      MatchEventType.CreateSingleMatch,
      authAndValidateRequest<CreateSingleMatchRequest, SingleMatchInfo>(
        socket,
        TCreateSingleMatchRequest,
        (request: CreateSingleMatchRequest, authToken, respond) => {
          console.log(MatchEventType.CreateSingleMatch, request, authToken);
          const matchInfo = createSingleMatch(authToken.id, request);
          respond(null, matchInfo);

          // this.scServer.exchange.subscribe()
        }
      )
    );

  }
}
