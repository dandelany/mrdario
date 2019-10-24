import * as t from "io-ts";
// high scores

export const THighScoresRow = t.tuple([t.string, t.number]);
export type HighScoresRow = t.TypeOf<typeof THighScoresRow>;

export const THighScoresResponse = t.type({
  level: t.number,
  scores: t.array(THighScoresRow)
});
export type HighScoresResponse = t.TypeOf<typeof THighScoresResponse>;

// game score - when user wins and sends score for high score
export const TGameScoreRequest = t.tuple([
  t.number, // level
  t.string, // name
  t.number // score
]);
export type GameScoreRequest = t.TypeOf<typeof TGameScoreRequest>;

export const TGameScoreResponse = t.type({
  rank: t.number,
  scores: t.array(THighScoresRow)
});
export type GameScoreResponse = t.TypeOf<typeof TGameScoreResponse>;
