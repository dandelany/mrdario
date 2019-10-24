import * as t from "io-ts";

// Types associated with the Match API

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
