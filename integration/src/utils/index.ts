import { GameClient } from "mrdario-core/lib/client";

export * from "./jest";
export * from "./redis";

export const A_JIFFY = 25;
export const TWO_SHAKES = 100;

// run server with .test.env - different port & database for tests
export const GAMESERVER_PORT = 8118;

export function getGameClient(): GameClient {
  return new GameClient({ socketOptions: { port: GAMESERVER_PORT } });
}

export async function connectGameClient(): Promise<GameClient> {
  const gameClient = getGameClient();
  const connecting = gameClient.connect();
  await expect(connecting).resolves.toBeTruthy();
  return gameClient;
}

export function sleep(time: number): Promise<number> {
  return new Promise(resolve => setTimeout(resolve, time));
}

