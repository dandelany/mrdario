import { constant, defaults, times } from "lodash";
import { SCServer, SCServerSocket } from "socketcluster-server";
import uuid from "uuid/v4";

import { CreateMatchRequest, Match, TCreateMatchRequest, MatchEventType } from "mrdario-core/lib/api/match";

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
  }
}
