export interface GameRouteParams {
  level: string;
  speed: string;
  mode: string;
}

export interface GameScoreResponse {
  rank: number;
  scores: Array<[string, number]>;
}
