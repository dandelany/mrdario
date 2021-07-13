import * as t from "io-ts";
import { strEnumType } from "../../utils/io";

// Types associated with the Match API

export const TCreateSingleMatchRequest = t.partial({
  // is Match publicly visible/watchable
  isPublic: t.boolean,
  // game level
  level: t.number,
  // game speed
  baseSpeed: t.number
});
export type CreateSingleMatchRequest = t.TypeOf<typeof TCreateSingleMatchRequest>;

// same type object used to update settings on the match
export const TUpdateSingleMatchSettingsRequest = TCreateSingleMatchRequest;
export type UpdateSingleMatchSettingsRequest = CreateSingleMatchRequest;

export enum MatchMode {
  Setup = "Setup",
  Countdown = "Countdown",
  Playing = "Playing",
  BetweenGames = "BetweenGames",
  Ended = "Ended",
  Cancelled = "Cancelled",
}

export const TSingleMatchInfo = t.type({
  // id of the match
  id: t.string,
  // user id of the creator of the match
  creatorId: t.string,
  // is Match publicly visible/watchable
  isPublic: t.boolean,
  // game level
  level: t.number,
  // game speed
  baseSpeed: t.number,
  // array of user ids of the game's players
  // length = playerCount, may contain nulls while waiting for players to join
  playerIds: t.array(t.union([t.string, t.null])),
  mode: strEnumType<MatchMode>(MatchMode, "MatchMode")
});
export type SingleMatchInfo = t.TypeOf<typeof TSingleMatchInfo>;



/* --- OLD WIP for multiplayer--- */

// enum of all types of socket events emitted by the Match module
export const TMatch = t.type({
  // id of the match
  id: t.string,
  // user id of the creator of the match
  creatorId: t.string,
  // # of players in the game
  playerCount: t.number,
  // array of user ids of the game's players
  // length = playerCount, may contain nulls while waiting for players to join
  playerIds: t.array(t.union([t.string, t.null])),
  // is the match open to anyone, or by invitation only?
  // if true, players must provide a challenge token to join the game
  // if false, anyone may join
  invitationOnly: t.boolean,
  // challenge token - string which may be used to join the game if invitation-only
  challengeToken: t.string,
  // array of game levels, one per player - each player may play their own level
  level: t.array(t.number),
  // array of game speeds, one per player - each player may play their own speed
  baseSpeed: t.array(t.number)
});
export type Match = t.TypeOf<typeof TMatch>;

// options which can be passed when creating a match
export const TCreateMatchRequest = t.partial({
  invitationOnly: t.boolean,
  level: t.number,
  baseSpeed: t.number
});
export type CreateMatchRequest = t.TypeOf<typeof TCreateMatchRequest>;


