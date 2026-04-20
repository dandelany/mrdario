import * as t from "io-ts";
// high scores

// get high scores
// sends a number - the level to get high scores for
export const TGetHighScoresRequest = t.number;
export type GetHighScoresRequest = t.TypeOf<typeof TGetHighScoresRequest>;

// a single high score (row) - ['name', <score>]
export const THighScoresRow = t.tuple([t.string, t.number]);
export type HighScoresRow = t.TypeOf<typeof THighScoresRow>;

// server sends back an object of high scores rows for that level
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

// response tells user what rank their high score was
export const TSaveScoreResponse = t.type({
  rank: t.number,
  scores: t.array(THighScoresRow)
});
export type SaveScoreResponse = t.TypeOf<typeof TSaveScoreResponse>;
