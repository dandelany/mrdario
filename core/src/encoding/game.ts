import { GameState } from "../Game";
import { encodeGrid } from "./grid";
import { MovingCounters, MovingDirections } from "../InputRepeater";
import { PillColors } from "../types";

export type EncodedGameState = string;

// todo decodeGameState

export function encodePillColors(pillColors: PillColors): string {
  const color0: number = pillColors[0].color;
  const color1: number = pillColors[1].color;
  return parseInt(String(color0) + String(color1), 10).toString(36);
}

export function encodePillSequence(pillSequence: PillColors[]): string {
  return pillSequence.map(encodePillColors).join("");
}

export function encodeMovingCounters(movingCounters: MovingCounters): string {
  return Array.from(movingCounters.values()).join(",");
}

export function encodeMovingDirections(movingDirections: MovingDirections): string {
  return Array.from(movingDirections.keys()).join(",");
}

export function encodeGameState(gameState: GameState): EncodedGameState {
  return JSON.stringify({
    ...gameState,
    grid: encodeGrid(gameState.grid),
    movingCounters: encodeMovingCounters(gameState.movingCounters),
    movingDirections: encodeMovingDirections(gameState.movingDirections),
    pillSequence: encodePillSequence(gameState.pillSequence)
  });
}
