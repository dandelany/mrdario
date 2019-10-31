import { countBy, includes, mean, range, sortBy } from "lodash";

import { COLORS, GameColor } from "../game";
import { seedRandom, seedRandomColor, seedRandomInt, seedShuffle } from "./random";

describe("Seeded Pseudo-Random Number Generators", () => {
  describe("seedRandom()", () => {
    test("makes a seeded random number", () => {
      const mockSeed = "hello";
      const randNum = seedRandom(mockSeed);
      expect(typeof randNum).toBe("number");
      expect(randNum).toBeGreaterThan(0);
      expect(randNum).toBeLessThan(1);
      // returns the same thing twice
      expect(randNum).toEqual(seedRandom(mockSeed));
      // returns different thing for different seed
      expect(randNum).not.toEqual(seedRandom("something else"));
    });
    test("numbers are reasonably well-distributed", () => {
      const baseSeed = "mock-seed";
      const randomNums = [...Array(1000).keys()].map(num => {
        return seedRandom(baseSeed + num);
      });
      const avgNum = mean(randomNums);
      expect(avgNum).toBeLessThan(0.53);
      expect(avgNum).toBeGreaterThan(0.47);
    });
  });

  describe("seedRandomInt()", () => {
    test("returns a random integer between min and max", () => {
      const baseSeed = "mrdario";
      [...Array(100).keys()].forEach((i: number) => {
        const min = i - 50;
        const max = i * 5;
        const randInt = seedRandomInt(baseSeed + i, min, max);
        expect(typeof randInt).toBe("number");
        // test it is an integer
        expect(randInt.toString()).toEqual(randInt.toFixed(0));
        expect(randInt).toBeGreaterThanOrEqual(min);
        expect(randInt).toBeLessThanOrEqual(max);
        expect(randInt).toEqual(seedRandomInt(baseSeed + i, min, max));
      });
    });
  });

  describe("seedRandomColor()", () => {
    test("returns a random GameColor", () => {
      const baseSeed = "rainbow";
      const colors: GameColor[] = [...Array(100).keys()].map((i: number) => {
        const randColor: GameColor = seedRandomColor(baseSeed + i);
        expect(typeof randColor).toBe("number");
        expect(includes(COLORS, randColor)).toBe(true);
        return randColor;
      });
      const colorCounts = countBy(colors);
      COLORS.forEach(color => {
        expect(colorCounts[color]).toBeGreaterThanOrEqual(25);
        expect(colorCounts[color]).toBeLessThanOrEqual(40);
      });
    });
  });

  describe("seedShuffle()", () => {
    test("shuffles an array into random order", () => {
      const origArr = range(10);
      const shuffled = seedShuffle("test", origArr);
      expect(shuffled).not.toEqual(origArr);
      // shuffled should contain all numbers in original
      expect(sortBy(shuffled)).toEqual(origArr);
      // shuffle with same seed should produce same order
      const shuffledSame = seedShuffle("test", origArr);
      expect(shuffledSame).toEqual(shuffled);
      // shuffle with diff seed should produce diff order
      const shuffledDifferent = seedShuffle("different seed", origArr);
      expect(shuffledDifferent).not.toEqual(shuffled);
      expect(shuffledDifferent).not.toEqual(origArr);
      expect(sortBy(shuffledDifferent)).toEqual(origArr);
    })
  })
});


