import { CreateSingleMatchRequest, MatchMode, SingleMatchInfo } from "mrdario-core/lib/api";
import { v4 as uuid } from "uuid";
import { defaults } from "lodash";
import { assert } from "mrdario-core/lib/utils/assert";

// temporarily store all matches in a JS object
// this doesn't scale to multiple workers! (each will have their own object)
// todo: store & update matches in Redis
const matches: { [key: string]: SingleMatchInfo } = {};

// to implement...
// - create a match
// - get a match by ID
// - update match - just have single update func? or specific functions:
//  - update match settings (in Setup mode only?)
//  - player joins a match
//  - player leaves a match
//
// - cancel/cleanup/delete match

// these are simplified functions that could be synchronous,
// but writing them as async prepares for future with async redis calls

// create a new match
export async function createSingleMatch(
  creatorId: string,
  options: CreateSingleMatchRequest
): Promise<SingleMatchInfo> {
  const defaultOptions = { isPublic: true, level: 10, baseSpeed: 15 };
  const fullOptions = defaults(options, defaultOptions);
  const { isPublic, level, baseSpeed } = fullOptions;
  // const playerIds = [creatorId, ...times(playerCount - 1, constant(null))];

  const matchId = uuid();
  const matchInfo: SingleMatchInfo = {
    id: matchId,
    mode: MatchMode.Setup,
    creatorId,
    playerIds: [creatorId],
    gamesOptions: [{ level, baseSpeed }],
    isPublic,
  };
  // save the match in the 'database'
  matches[matchId] = matchInfo;

  return matchInfo;
}

function assertMatchExists(matchId: string) {
  assert(matchId in matches, `Match ID ${matchId} not in matches`);
}

// get an existing match by ID
export async function getMatch(matchId: string): Promise<SingleMatchInfo> {
  assertMatchExists(matchId);
  return matches[matchId];
}

// update a match by ID with a partial match object (patch)
export async function updateMatch(
  matchId: string,
  matchPatch: Partial<SingleMatchInfo>
): Promise<SingleMatchInfo> {
  assertMatchExists(matchId);
  const match = matches[matchId];
  const patchedMatch = Object.assign({}, match, matchPatch);
  matches[matchId] = patchedMatch;
  return patchedMatch;
}

export async function updateMatchGameOptions(
  match: SingleMatchInfo,
  gameIndex: number,
  gameOptions: Partial<{ level: number; baseSpeed: number }>
) {
  assert(gameIndex <= match.gamesOptions.length - 1, `${gameIndex} is not a valid game index`);
  const prevOptions = match.gamesOptions[gameIndex];
  const nextOptions = {...prevOptions, ...gameOptions};
  let gamesOptions = match.gamesOptions.slice();
  gamesOptions.splice(gameIndex, 1, nextOptions);
  const patchedMatch = Object.assign({}, match, {gamesOptions});
  matches[match.id] = patchedMatch;
  return patchedMatch;
}
