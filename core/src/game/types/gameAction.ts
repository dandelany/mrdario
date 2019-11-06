import * as t from "io-ts";

import { tGameColor, tGameInputMove, tInputEventType } from "./types";
import { strEnumType } from "../../utils/io";

// GameActions represent events from the "outside world" which affect game state
// these include our player's move inputs, as well as actions caused by other players

// game action types
export enum GameActionType {
  Move = "Move",
  Garbage = "Garbage",
  Seed = "Seed",
  Defeat = "Defeat",
  ForfeitWin = "ForfeitWin"
}
export const tGameActionType = strEnumType<GameActionType>(GameActionType, "GameActionType");

// Move action
// represents a move button being pressed or released (depending on eventType)
export const tGameActionMove = t.type(
  {
    type: t.literal(GameActionType.Move),
    input: tGameInputMove,
    eventType: tInputEventType
  },
  "GameActionMove"
);
export type GameActionMove = t.TypeOf<typeof tGameActionMove>;

// Garbage action
// other player got a combo and sent you "garbage" (extra pieces to deal with)
export const tGameActionGarbage = t.interface(
  {
    type: t.literal(GameActionType.Garbage),
    colors: t.array(tGameColor)
  },
  "GameActionGarbage"
);
export type GameActionGarbage = t.TypeOf<typeof tGameActionGarbage>;

// Seed action
// change the game's random number seed (so that server can make upcoming pills unpredictable)
export const tGameActionSeed = t.interface(
  {
    type: t.literal(GameActionType.Seed),
    seed: t.string
  },
  "GameActionSeed"
);
export type GameActionSeed = t.TypeOf<typeof tGameActionSeed>;

// Defeat action
// Lose the game because the other player won (destroyed all viruses)
export const tGameActionDefeat = t.interface(
  {
    type: t.literal(GameActionType.Defeat)
  },
  "GameActionDefeat"
);
export type GameActionDefeat = t.TypeOf<typeof tGameActionDefeat>;

// ForfeitWin action
// Win the game because the other player lost (filled up with pills)
export const tGameActionForfeitWin = t.interface(
  { type: t.literal(GameActionType.ForfeitWin) },
  "GameActionForfeitWin"
);
export type GameActionForfeitWin = t.TypeOf<typeof tGameActionForfeitWin>;

// union type of all possible game actions
export const tGameAction = t.union(
  [tGameActionMove, tGameActionGarbage, tGameActionSeed, tGameActionDefeat, tGameActionForfeitWin],
  "GameAction"
);
export type GameAction = t.TypeOf<typeof tGameAction>;

// to support network gameplay with variable lag,
// the game controllers emit pairs of [frame, actions]
// where `frame` is the game frame # on which the actions took place,
// so that the server/other clients can time/sync them appropriately

// export type TimedGameActions = [number, GameAction[]];
// export type TimedMoveActions = [number, GameActionMove[]];

export const tTimedGameActions = t.tuple([t.number, t.array(tGameAction)], "TimedGameActions");
export type TimedGameActions = t.TypeOf<typeof tTimedGameActions>;

export const tTimedMoveActions = t.tuple([t.number, t.array(tGameActionMove)], "TimedMoveActions");
export type TimedMoveActions = t.TypeOf<typeof tTimedMoveActions>;
