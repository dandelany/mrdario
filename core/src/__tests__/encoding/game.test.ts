import {
  decodeGrid,
  decodeInt,
  decodePillColors,
  decodePillSequence, encodeGameState,
  encodeInt,
  encodePillColors,
  encodePillSequence
} from "../../encoding";
import { GameColor, GameInput, GameInputMove, GameMode, PillColors } from "../../types";
import { COLORS } from "../../constants";
import { GameState } from "../../Game";

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
      for (let color1 of COLORS) {
        for (let color2 of COLORS) {
          const pillColors: PillColors = [{ color: color1 }, { color: color2 }];
          const encoded = encodePillColors(pillColors);
          expect(typeof encoded).toBe("string");
          expect(encoded).toHaveLength(1);
        }
      }
    });
    test("decodePillColors(encoded) returns decoded colors", () => {
      for (let color1 of COLORS) {
        for (let color2 of COLORS) {
          const pillColors: PillColors = [{ color: color1 }, { color: color2 }];
          const encoded = encodePillColors(pillColors);
          const decoded: PillColors = decodePillColors(encoded);
          expect(decoded).toEqual(pillColors);
        }
      }
    });
    test("encode/decodePillSequence encodes/decodes an array of PillColors", () => {
      const sequence: PillColors[] = [
        [{ color: GameColor.Color1 }, { color: GameColor.Color2 }],
        [{ color: GameColor.Color2 }, { color: GameColor.Color3 }],
        [{ color: GameColor.Color3 }, { color: GameColor.Color3 }]
      ];
      const encoded = encodePillSequence(sequence);
      expect(typeof encoded).toBe("string");
      expect(encoded).toHaveLength(sequence.length);
      expect(decodePillSequence(encoded)).toEqual(sequence);
    });
  });

  describe("Game State Encoding", () => {
    test("encodeGameState encodes game state into a string", () => {
      const gameState: GameState = getMockGameState();
      const encoded = encodeGameState(gameState);
      expect(typeof encoded).toBe("string");
      console.log(encoded);
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
    seed: 'mock-seed',
    pillSequence: decodePillSequence('123456789a'),
    movingCounters: new Map([[GameInput.Left as GameInputMove, 3]]),
    movingDirections: new Map<GameInputMove, true>([[GameInput.Left, true]]),
    // options: {
    //   level: 1,
    //   baseSpeed: 12,
    //   width: 8,
    //   height: 17
    // }
  }
}
