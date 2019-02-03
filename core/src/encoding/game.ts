import { GameState, EncodableGameOptions } from "../Game";
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
}
export function decodePillColors(encodedColors: string): PillColors {
  // todo validate pill colors string
  invariant(encodedColors.length === 1, "Invalid pill colors string - expected 1 character");
  const combinedNum: number = decodeInt(encodedColors);
  const color0 = combinedNum >> 2;
  const color1 = combinedNum & 0b11;
  return [{color: color0}, {color: color1}];
}

export function encodePillSequence(pillSequence: PillColors[]): string {
  return pillSequence.map(encodePillColors).join("");
}
export function decodePillSequence(encodedSequence: string): PillColors[] {
  const encodedArr = encodedSequence.split("");
  return encodedArr.map(encoded => decodePillColors(encoded));
}

export function encodeMovingCounters(movingCounters: MovingCounters): string {
  return Array.from(movingCounters.values()).join(",");
}
// todo decodeMovingCounters

export function encodeMovingDirections(movingDirections: MovingDirections): string {
  return Array.from(movingDirections.keys()).join(",");
}

export function encodeGameOptions(options: EncodableGameOptions) {
  const {width, height, level, baseSpeed} = options;
  return [
    encodeInt(width),
    encodeInt(height),
    encodeInt(level),
    encodeInt(baseSpeed)
  ]
}


export function encodeGameState(state: GameState): EncodedGameState {
  return JSON.stringify({
    ...state,
    grid: encodeGrid(state.grid),
    frame: encodeInt(state.frame),
    // options: encodeGameStateOptions(state.options),
    score: encodeInt(state.score),
    timeBonus: encodeInt(state.timeBonus),
    gameTicks: encodeInt(state.gameTicks),
    modeTicks: encodeInt(state.modeTicks),
    pillCount: encodeInt(state.pillCount),
    movingCounters: encodeMovingCounters(state.movingCounters),
    movingDirections: encodeMovingDirections(state.movingDirections),
    pillSequence: encodePillSequence(state.pillSequence)
  });
}
