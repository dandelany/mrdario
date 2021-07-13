import { alea, prng } from "seedrandom";
import { COLORS } from "../game/constants";
import { GameColor } from "../game/types";

export function seedRandom(seed: string, double: boolean = false): number {
  // alea = fast PRNG
  const rng: prng = alea(seed);
  // Use "double" to get 56 bits of randomness (seedrandom docs)
  return double ? rng.double() : rng();
}

export function seedRandomInt(seed: string, min: number = 0, max: number = 1, double: boolean = false) {
  // gets seeded pseudorandom integer >= min and <= max (inclusive)
  return Math.floor(seedRandom(seed, double) * (max - min + 1)) + min;
}

export function seedRandomColor(seed: string): GameColor {
  return seedRandomInt(seed, 0, COLORS.length - 1) as GameColor;
}


export function seedShuffle<T>(seed: string, array: T[]): T[] {
  let index = -1;
  const length = array.length;
  const lastIndex = length - 1;

  const arrCopy = array.slice();

  while (++index < length) {
    const rand = seedRandomInt(seed + index, index, lastIndex);
    const value = arrCopy[rand];

    arrCopy[rand] = arrCopy[index];
    arrCopy[index] = value;
  }
  return arrCopy;
}
