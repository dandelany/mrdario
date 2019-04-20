import invariant = require("invariant");
import * as t from "io-ts";
import { EncodableGameOptions, GameState } from "../game";
import { MovingCounters } from "../game/InputRepeater";
import { PillColors, tPillColors, GameInput } from "../game/types";
import { GameColor } from "../game/enums";
import { encodeGrid } from "./grid";
import { numEnumType, strEnumType } from "./utils";

export type EncodedGameState = string;

// todo decodeGameState

// codec which encodes an integer as a base36 string
export const tEncodedInt = new t.Type<number, string, unknown>(
  'EncodedInt',
  t.number.is,
  (input: unknown, context: t.Context) => {
    const int = parseInt(String(input), 36);
    return isNaN(int) ? t.failure(input, context, "cannot parse to a number") : t.success(int);
  },
  (int: number): string => {
    return int.toString(36);
  }
);

export function encodeInt(num: number): string {
  return num.toString(36);
}
export function decodeInt(numStr: string): number {
  return parseInt(numStr, 36);
}

// export const tPillColors = new t.Type<PillColors>
export const tGameInput = strEnumType<GameInput>(GameInput, 'GameInput');


export const tGameColor = numEnumType<GameColor>(GameColor, "GameColor");

export const tPillColorsCodec = new t.Type<PillColors, string, unknown>(
  "PillColors",
  tPillColors.is,
  (input: unknown, context) => {
    if(!t.string.is(input) || input.length !== 1) {
      return t.failure(input, context, "Invalid pill colors string - expected 1 character");
    }
    return tEncodedInt.validate(input, context).chain((combinedInt: number) => {
      const color0: number = combinedInt >> 2;
      const color1: number = combinedInt & 0b11;
      if(!tGameColor.is(color0)) {
        return t.failure(input, context, "Invalid pill colors - color 0 is not a valid GameColor");
      } else if(!tGameColor.is(color1)) {
        return t.failure(input, context, "Invalid pill colors - color 1 is not a valid GameColor");
      } else {
        return t.success([color0, color1] as PillColors);
      }
    });
  },
  (pillColors: PillColors) => {
    const color0: number = pillColors[0];
    const color1: number = pillColors[1];
    // there are only 3 colors (0, 1, 2), so we can cheaply fit 2 in 1 character by bit shifting them
    const combined: number = (color0 << 2) + color1;
    return tEncodedInt.encode(combined);
  }
);

export function encodePillColors(pillColors: PillColors): string {
  const color0: number = pillColors[0];
  const color1: number = pillColors[1];
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
  return [color0, color1];
}

export function encodeMovingCounters(movingCounters: MovingCounters): string {
  const entries = Array.from(movingCounters.entries());
  return JSON.stringify(entries);
}
// todo decodeMovingCounters

export function encodeGameOptions(options: EncodableGameOptions): string {
  const { width, height, level, baseSpeed } = options;
  return [encodeInt(width), encodeInt(height), encodeInt(level), encodeInt(baseSpeed)].join(",");
}
export function decodeGameOptions(encoded: string): EncodableGameOptions {
  const optionStrs = encoded.split(",");
  invariant(optionStrs.length === 4, "Invalid game options");
  const optionsArr = optionStrs.map(decodeInt);
  const [width, height, level, baseSpeed] = optionsArr;
  return { width, height, level, baseSpeed };
}

export function encodeGameState(state: GameState): EncodedGameState {
  return JSON.stringify({
    ...state,
    grid: encodeGrid(state.grid),
    nextPill: encodePillColors(state.nextPill),
    frame: tEncodedInt.encode(state.frame),
    score: tEncodedInt.encode(state.score),
    timeBonus: tEncodedInt.encode(state.timeBonus),
    gameTicks: tEncodedInt.encode(state.gameTicks),
    modeTicks: tEncodedInt.encode(state.modeTicks),
    pillCount: tEncodedInt.encode(state.pillCount),
    movingCounters: encodeMovingCounters(state.movingCounters)
  });
}
