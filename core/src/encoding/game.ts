import { GameState, GameCounters } from "../Game";
import { encodeGrid } from "./grid";
import { MovingCounters, MovingDirections } from "../InputRepeater";
import { PillColors } from "../types";
import invariant = require("invariant");

export type EncodedGameState = string;

// todo decodeGameState

export function encodeInt(num: number): string {
  return num.toString(36);
}
export function decodeInt(numStr: string): number {
  return parseInt(numStr, 36);
}

export function encodePillColors(pillColors: PillColors): string {
  const color0: number = pillColors[0].color;
  const color1: number = pillColors[1].color;
  // there are only 3 colors (0, 1, 2), so we can cheaply fit 2 in 1 character by bit shifting them
  const combined: number = (color0 << 2) + color1;
  return encodeInt(combined);

  // return encodeInt(parseInt(String(color0) + String(color1), 10));
}
export function decodePillColors(encodedColors: string): PillColors {
  // todo validate pill colors string
  invariant(encodedColors.length === 1, "Invalid pill colors string - expected 1 character");
  const combinedNum: number = decodeInt(encodedColors);
  const color0 = combinedNum >> 2;
  const color1 = combinedNum & 0b11;
  return [{color: color0}, {color: color1}];
}

// todo decodePillColors
// export function decodePillColors(): string {
//
// }

export function encodePillSequence(pillSequence: PillColors[]): string {
  return pillSequence.map(encodePillColors).join("");
}
export function decodePillSequence(encodedSequence: string): PillColors[] {
  const encodedArr = encodedSequence.split("");
  return encodedArr.map(encoded => decodePillColors(encoded));
}
// todo decodePillSequence

export function encodeMovingCounters(movingCounters: MovingCounters): string {
  return Array.from(movingCounters.values()).join(",");
}
// todo decodeMovingCounters

export function encodeMovingDirections(movingDirections: MovingDirections): string {
  return Array.from(movingDirections.keys()).join(",");
}

export function encodeGameCounters(gameCounters: GameCounters) {
  const { gameTicks, playTicks, cascadeTicks, destroyTicks, pillCount } = gameCounters;
  return [
    encodeInt(gameTicks),
    encodeInt(playTicks),
    encodeInt(cascadeTicks),
    encodeInt(destroyTicks),
    encodeInt(pillCount)
  ].join(",");
}

export function encodeGameState(gameState: GameState): EncodedGameState {
  return JSON.stringify({
    ...gameState,
    grid: encodeGrid(gameState.grid),
    score: encodeInt(gameState.score),
    timeBonus: encodeInt(gameState.timeBonus),
    counters: encodeGameCounters(gameState.counters),
    movingCounters: encodeMovingCounters(gameState.movingCounters),
    movingDirections: encodeMovingDirections(gameState.movingDirections),
    pillSequence: encodePillSequence(gameState.pillSequence)
  });
}
