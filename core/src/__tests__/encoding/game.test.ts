import {
  decodeGrid,
  decodeInt,
  decodePillColors,
  encodeGameState,
  encodeInt,
  encodePillColors
} from "../../encoding";
import { GameColor, GameInput, GameInputMove, GameMode, PillColors } from "../../game";
import { COLORS } from "../../game";
import { GameState } from "../../game";

describe("Game Encoding", () => {
  describe("Integer Encoding", () => {
    test("encodeInt encodes an integer into a string", () => {
      const intValue = 1111;
      const encoded = encodeInt(intValue);
      expect(typeof encoded).toEqual("string");
      expect(encoded.length).toBeLessThan(intValue.toString().length);
    });
    test("decodeInt(encodedInt)) returns decoded integer", () => {
      const intValue = 2323;
      const encoded = encodeInt(intValue);
      const decoded = decodeInt(encoded);
      expect(typeof decoded).toEqual("number");
      expect(decoded).toBe(intValue);
    });
  });

  describe("Pill Color/Sequence Encoding", () => {
    test("encodePillColors encodes two pill colors into a single character", () => {
      for (const color1 of COLORS) {
        for (const color2 of COLORS) {
          const pillColors: PillColors = [color1, color2];
          const encoded = encodePillColors(pillColors);
          expect(typeof encoded).toBe("string");
          expect(encoded).toHaveLength(1);
        }
      }
    });
    test("decodePillColors(encoded) returns decoded colors", () => {
      for (const color1 of COLORS) {
        for (const color2 of COLORS) {
          const pillColors: PillColors = [color1, color2];
          const encoded = encodePillColors(pillColors);
          const decoded: PillColors = decodePillColors(encoded);
          expect(decoded).toEqual(pillColors);
        }
      }
    });
  });

  describe("Game State Encoding", () => {
    test("encodeGameState encodes game state into a string", () => {
      const gameState: GameState = getMockGameState();
      const encoded = encodeGameState(gameState);
      expect(typeof encoded).toBe("string");
    });
  });
});

function getMockGameState(): GameState {
  return {
    mode: GameMode.Playing,
    frame: 123,
    grid: decodeGrid(`g5,6:
      XXXXXX
      XXDBXX
      XNXVXX
      LRKFXN
      XCSTRX
    `),
    pill: [[1, 2], [1, 3]],
    score: 900,
    timeBonus: 2000,
    gameTicks: 34,
    modeTicks: 0,
    pillCount: 3,
    lineColors: [],
    seed: "mock-seed",
    nextPill: [GameColor.Color1, GameColor.Color2],
    movingCounters: new Map<GameInputMove, number>([[GameInput.Left, 3]]),
  };
}
