import * as t from "io-ts";
// high scores

export const THighScoresRow = t.tuple([t.string, t.number]);
export type HighScoresRow = t.TypeOf<typeof THighScoresRow>;

// get high scores
export const TGetHighScoresRequest = t.number;
export type GetHighScoresRequest = t.TypeOf<typeof TGetHighScoresRequest>;

export const TGetHighScoresResponse = t.type({
  level: t.number,
  scores: t.array(THighScoresRow)
});
export type GetHighScoresResponse = t.TypeOf<typeof TGetHighScoresResponse>;


// save score - when user wins and sends score for high score
export const TSaveScoreRequest = t.tuple([
  t.number, // level
  t.string, // name
  t.number // score
]);
export type SaveScoreRequest = t.TypeOf<typeof TSaveScoreRequest>;

export const TSaveScoreResponse = t.type({
  rank: t.number,
  scores: t.array(THighScoresRow)
});
export type SaveScoreResponse = t.TypeOf<typeof TSaveScoreResponse>;
