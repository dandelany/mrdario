import * as t from "io-ts";
import { strEnumType } from "../../utils/io";

export enum MatchMode {
  Setup = "Setup",
  Countdown = "Countdown", //??
    // or Ready?
  Playing = "Playing",
  BetweenGames = "BetweenGames",
  Ended = "Ended",
  Cancelled = "Cancelled",
}

export enum MatchEventType {
  CreateSingleMatch = "CreateSingleMatch",
  GetMatch = "GetMatch",
  UpdateMatchSettings = "UpdateMatchSettings",
  JoinMatch = "JoinMatch",
}

function tExactType<P extends t.Props>(tTypeConfig: P) {
  return t.exact(t.type<P>(tTypeConfig));
}

// Types associated with the Match API

// -- create match
export const TCreateSingleMatchRequest = t.partial({
  // is Match publicly visible/watchable
  isPublic: t.boolean,
  // game level
  level: t.number,
  // game speed
  baseSpeed: t.number,
});
export type CreateSingleMatchRequest = t.TypeOf<typeof TCreateSingleMatchRequest>;

// request used update settings on the match
export const TUpdateMatchSettingsRequest = tExactType({
  matchId: t.string,
  gameIndex: t.number,
  gameOptions: t.partial({
    level: t.number,
    baseSpeed: t.number,
  })
});

export type UpdateMatchSettingsRequest = t.TypeOf<typeof TUpdateMatchSettingsRequest>;



export const TSingleMatchInfo = t.type({
  // id of the match
  id: t.string,
  // current mode the match is in - starts in Setup mode
  mode: strEnumType<MatchMode>(MatchMode, "MatchMode"),
  // user id of the creator of the match
  creatorId: t.string,
  // array of user ids of the game's players
  // length = playerCount, may contain nulls while waiting for players to join
  playerIds: t.array(t.union([t.string, t.null])),
  // game options used to create the games
  gamesOptions: t.array(
    tExactType({
      level: t.number,
      baseSpeed: t.number,
    })
  ),
  // is Match publicly visible/watchable
  isPublic: t.boolean,

  // todo
  //  channelName: SC channel where match events are published?
  //  what # game in the match are we on? results of past games in match?
  //  keep track of current level (vs. starting level??)
  //  - nextGamesOptions?
  //  invitationOnly - if true, other players need invite token to join match
  //  inviteToken - random string given to other players to invite them to invitationOnly match

});
export type SingleMatchInfo = t.TypeOf<typeof TSingleMatchInfo>;

// -- get match
export const TGetMatchRequest = t.string;
export type GetMatchRequest = t.TypeOf<typeof TGetMatchRequest>;



/* --- OLD WIP for multiplayer--- */

// // enum of all types of socket events emitted by the Match module
// export const TMatch = t.type({
//   // id of the match
//   id: t.string,
//   // user id of the creator of the match
//   creatorId: t.string,
//   // # of players in the game
//   playerCount: t.number,
//   // array of user ids of the game's players
//   // length = playerCount, may contain nulls while waiting for players to join
//   playerIds: t.array(t.union([t.string, t.null])),
//   // is the match open to anyone, or by invitation only?
//   // if true, players must provide a challenge token to join the game
//   // if false, anyone may join
//   invitationOnly: t.boolean,
//   // challenge token - string which may be used to join the game if invitation-only
//   challengeToken: t.string,
//   // array of game levels, one per player - each player may play their own level
//   level: t.array(t.number),
//   // array of game speeds, one per player - each player may play their own speed
//   baseSpeed: t.array(t.number)
// });
// export type Match = t.TypeOf<typeof TMatch>;
//
// // options which can be passed when creating a match
// export const TCreateMatchRequest = t.partial({
//   invitationOnly: t.boolean,
//   level: t.number,
//   baseSpeed: t.number
// });
// export type CreateMatchRequest = t.TypeOf<typeof TCreateMatchRequest>;
//
//
