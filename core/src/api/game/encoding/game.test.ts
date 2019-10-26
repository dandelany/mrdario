import {
  decodeGrid,
  decodeInt,
  // decodePillColors,
  encodeGameState,
  encodeInt,
  // encodePillColors,
  tEncodedInt,
  tPillColorsCodec
  // tGameInput
} from "./index";
import { COLORS, GameColor, GameInput, GameInputMove, GameMode, GameState, PillColors } from "../../../game";

describe("Game Encoding", () => {
  describe("Integer Encoding with tEncodedInt", () => {
    test("tEncodedInt encodes an integer into a string", () => {
      const intValue = 1111;
      const encoded = tEncodedInt.encode(intValue);
      expect(typeof encoded).toEqual("string");
      expect(encoded.length).toBeLessThan(intValue.toString().length);
    });
    test("decode(encode(integer)) returns integer", () => {
      const intValue = 23234567;
      const encoded = tEncodedInt.encode(intValue);
      const decoded = tEncodedInt.decode(encoded);
      expect(decoded.isRight()).toBe(true);
      if (decoded.isRight()) {
        expect(decoded.value).toEqual(intValue);
      }
    });
  });

  // describe("tGameInput Encoding", () => {
  //   test("tGameInput encoding", () => {
  //     const input = GameInput.Left;
  //     const decoded = tGameInput.decode(input);
  //     expect(decoded.isRight()).toBe(true);
  //     if(decoded.isRight()) {
  //       expect(decoded.value).toEqual(input);
  //     }
  //     const badInput = "BadInput";
  //     const badDecoded = tGameInput.decode(badInput);
  //     expect(badDecoded.isRight()).toBe(false);
  //   });
  // });

  // todo: deprecate
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

  describe("Pill Colors codec", () => {
    test("tPillColorsCodec encodes two pill colors into a single character", () => {
      for (const color1 of COLORS) {
        for (const color2 of COLORS) {
          const pillColors: PillColors = [color1, color2];
          const encoded = tPillColorsCodec.encode(pillColors);
          expect(typeof encoded).toBe("string");
          expect(encoded).toHaveLength(1);
        }
      }
    });
    test("decode(encoded) returns decoded colors", () => {
      for (const color1 of COLORS) {
        for (const color2 of COLORS) {
          const pillColors: PillColors = [color1, color2];
          const encoded = tPillColorsCodec.encode(pillColors);
          const decoded = tPillColorsCodec.decode(encoded);
          expect(decoded.isRight()).toBe(true);
          if (decoded.isRight()) {
            expect(decoded.value).toEqual(pillColors);
          }
        }
      }
    });
    test("decode fails for invalid pill colors", () => {
      expect(tPillColorsCodec.decode(null).isRight()).toBe(false);
      expect(tPillColorsCodec.decode(undefined).isRight()).toBe(false);
      expect(tPillColorsCodec.decode(0).isRight()).toBe(false);
      expect(tPillColorsCodec.decode("00").isRight()).toBe(false);
      expect(tPillColorsCodec.decode("z").isRight()).toBe(false);
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
    movingCounters: new Map<GameInputMove, number>([[GameInput.Left, 3]])
  };
}
