import { createSingleMatch, getMatch, updateMatchGameOptions } from "./MatchStore.js";
import {
  CreateSingleMatchRequest,
  GetMatchRequest,
  MatchEventType,
  SingleMatchInfo,
  TCreateSingleMatchRequest,
  TGetMatchRequest
} from "mrdario-core/api/match";
import { TUpdateMatchSettingsRequest, UpdateMatchSettingsRequest } from "mrdario-core/api";
import { assert } from "mrdario-core/utils/assert";

import { defineServerModule } from "../../runtime/types.js";
import type { AuthenticatedModuleContext } from "../../runtime/types.js";

export function createMatchModule() {
  return defineServerModule({
    name: "match",
    procedures: [
      {
        eventType: MatchEventType.CreateSingleMatch,
        auth: "required",
        codec: TCreateSingleMatchRequest,
        handler: async (
          ctx: AuthenticatedModuleContext,
          request: CreateSingleMatchRequest
        ): Promise<SingleMatchInfo> => {
          console.log(MatchEventType.CreateSingleMatch, request, ctx.authToken);
          return createSingleMatch(ctx.authToken.id, request);
        }
      },
      {
        eventType: MatchEventType.GetMatch,
        auth: "required",
        codec: TGetMatchRequest,
        handler: async (_ctx: AuthenticatedModuleContext, request: GetMatchRequest): Promise<SingleMatchInfo> => {
          console.log(MatchEventType.GetMatch, request, _ctx.authToken);
          return getMatch(request);
        }
      },
      {
        eventType: MatchEventType.UpdateMatchSettings,
        auth: "required",
        codec: TUpdateMatchSettingsRequest,
        handler: async (
          ctx: AuthenticatedModuleContext,
          request: UpdateMatchSettingsRequest
        ): Promise<SingleMatchInfo> => {
          const userId = ctx.authToken.id;
          const { matchId, gameIndex, gameOptions } = request;
          console.log(MatchEventType.UpdateMatchSettings, request, ctx.authToken);

          const match = await getMatch(matchId);
          assert(gameIndex <= match.gamesOptions.length - 1, `${gameIndex} is not a valid game index`);
          assert(
            gameIndex <= match.playerIds.length - 1 && match.playerIds[gameIndex] === userId,
            `user ${userId} not allowed to modify game ${gameIndex} options for player ${match.playerIds[gameIndex]}`
          );

          return updateMatchGameOptions(match, gameIndex, gameOptions);
        }
      }
    ]
  });
}
