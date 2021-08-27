import { SCServer, SCServerSocket } from "socketcluster-server";

import { createSingleMatch, getMatch, updateMatchGameOptions } from "./MatchStore";
import {
  CreateSingleMatchRequest,
  MatchEventType,
  SingleMatchInfo,
  TCreateSingleMatchRequest,
  GetMatchRequest,
  TGetMatchRequest,
} from "mrdario-core/src/api/match";

import { authAndValidateRequest } from "../../utils";
import { TUpdateMatchSettingsRequest, UpdateMatchSettingsRequest } from "mrdario-core/lib/api";
import { assert } from "mrdario-core/lib/utils/assert";

// function createSingleMatch(creatorId: string, options: CreateSingleMatchRequest): SingleMatchInfo {
//   const defaultOptions = { isPublic: true, level: 10, baseSpeed: 15 };
//   const fullOptions = defaults(options, defaultOptions);
//   const { isPublic, level, baseSpeed } = fullOptions;
//   return {
//     id: uuid(),
//     creatorId,
//     playerIds: [creatorId],
//     isPublic,
//     level,
//     baseSpeed,
//     mode: MatchMode.Setup
//   };
// }

export class MatchModule {
  scServer: SCServer;

  constructor(scServer: SCServer) {
    this.scServer = scServer;
  }
  public handleConnect(socket: SCServerSocket) {
    socket.on(
      MatchEventType.CreateSingleMatch,
      authAndValidateRequest<CreateSingleMatchRequest, SingleMatchInfo>(
        socket,
        TCreateSingleMatchRequest,
        async (request: CreateSingleMatchRequest, authToken, respond) => {
          try {
            // todo: if this user already has an active match, cancel it or reject this request?
            //  or have "force" option to optionally cancel existing match?

            console.log(MatchEventType.CreateSingleMatch, request, authToken);
            const matchInfo = await createSingleMatch(authToken.id, request);
            respond(null, matchInfo);

            // this.scServer.exchange.subscribe()
          } catch (err) {
            respond(err, null);
          }
        }
      )
    );

    // get a match by ID
    //  - match creator/player might refresh & need to get match info again
    //  - spectators?
    socket.on(
      MatchEventType.GetMatch,
      authAndValidateRequest<GetMatchRequest, SingleMatchInfo>(
        socket,
        TGetMatchRequest,
        async (request: GetMatchRequest, authToken, respond) => {
          try {
            console.log(MatchEventType.GetMatch, request, authToken);
            const matchInfo = await getMatch(request);
            respond(null, matchInfo);
          } catch (err) {
            respond(err, null);
          }
        }
      )
    );

    // todo: should match settings updates/ready be on channels instead of events?
    socket.on(
      MatchEventType.UpdateMatchSettings,
      authAndValidateRequest<UpdateMatchSettingsRequest, SingleMatchInfo>(
        socket,
        TUpdateMatchSettingsRequest,
        async (request, authToken, respond) => {
          try {
            const userId = authToken.id;
            const { matchId, gameIndex, gameOptions } = request;
            console.log(MatchEventType.UpdateMatchSettings, request, authToken);

            const match = await getMatch(matchId);
            //  check gameIndex is valid & user is allowed to change setting (ie. is correct player)
            assert(gameIndex <= match.gamesOptions.length - 1, `${gameIndex} is not a valid game index`);
            assert(
              gameIndex <= match.playerIds.length - 1 && match.playerIds[gameIndex] === userId,
              `User ${userId} not allowed to modify game ${gameIndex} options for player ${match.playerIds[gameIndex]}`
            );
            // todo check that level & baseSpeed are valid numbers

            const updatedMatch = await updateMatchGameOptions(match, gameIndex, gameOptions);
            respond(null, updatedMatch);
          } catch (err) {
            respond(err, null);
          }
        }
      )
    );

    // todo: handle match "ready"
    // for single player, only need one ready event
  }
}


class MatchManager {
  // one MatchManager per worker

}
