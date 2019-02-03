import { alea, prng } from "seedrandom";
import { COLORS } from "../constants";
import { GameColor } from "../types";

export function seedRandom(seed: string, double: boolean = false): number {
  // use alea - fast PRNG
  const rng: prng = alea(seed);
  // Use "double" to get 56 bits of randomness (seedrandom docs)
  return double ? rng.double() : rng();
}

export function seedRandomInt(seed: string, min: number = 0, max: number = 1, double: boolean = false) {
  return Math.floor(seedRandom(seed, double) * (max - min + 1)) + min;
}

export function seedRandomColor(seed: string): GameColor {
  return seedRandomInt(seed, 0, COLORS.length - 1) as GameColor;
}
