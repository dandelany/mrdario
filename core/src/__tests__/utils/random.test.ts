import { seedRandom, seedRandomColor, seedRandomInt } from "../../utils/random";
import { mean, includes, countBy } from "lodash";
import { GameColor } from "../../types";
import { COLORS } from "../../constants";

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
});
