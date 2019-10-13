import * as t from "io-ts";

import { GameColor, GameInput, GameMode, GridDirection, GridObjectType, InputEventType, SpeedLevel } from "./enums";
import { MovingCounters } from "./InputRepeater";
import { numEnumType, strEnumType } from "../encoding/utils";

export * from "./enums";
export * from "./input/types";
export * from "./controller/types";

export const tGameColor = numEnumType<GameColor>(GameColor, "GameColor");
export const tGameInput = strEnumType<GameInput>(GameInput, "GameInput");
export const tGameMode = strEnumType<GameMode>(GameMode, "GameMode");
export const tGridDirection = strEnumType<GridDirection>(GridDirection, "GridDirection");
export const tGridObjectType = strEnumType<GridObjectType>(GridObjectType, "GridObjectType");
export const tInputEventType = strEnumType<InputEventType>(InputEventType, "InputEventType");
export const tSpeedLevel = strEnumType<SpeedLevel>(SpeedLevel, "SpeedLevel");

export type OneOrMore<T> = { 0: T } & T[];

export const tGridObjectBase = t.type({
  type: tGridObjectType
});

export const tGridObjectWithColor = t.type({
  type: tGridObjectType,
  color: tGameColor
});

export const tGridObjectDestroyed = t.type({
  type: t.literal(GridObjectType.Destroyed)
});
// export type TGridObjectDestroyed = t.TypeOf<typeof tGridObjectDestroyed>;


export interface GridObjectBase {
  readonly type: GridObjectType;
}
export interface GridObjectWithColor extends GridObjectBase {
  color: GameColor;
}
export interface GridObjectDestroyed extends GridObjectBase {
  type: GridObjectType.Destroyed;
}
export interface GridObjectEmpty extends GridObjectBase {
  type: GridObjectType.Empty;
}
export interface GridObjectPillLeft extends GridObjectWithColor {
  type: GridObjectType.PillLeft;
}
export interface GridObjectPillRight extends GridObjectWithColor {
  type: GridObjectType.PillRight;
}
export interface GridObjectPillBottom extends GridObjectWithColor {
  type: GridObjectType.PillBottom;
}
export interface GridObjectPillTop extends GridObjectWithColor {
  type: GridObjectType.PillTop;
}
export interface GridObjectPillSegment extends GridObjectWithColor {
  type: GridObjectType.PillSegment;
}
export interface GridObjectVirus extends GridObjectWithColor {
  type: GridObjectType.Virus;
}
export type GridObject =
  | GridObjectDestroyed
  | GridObjectEmpty
  | GridObjectPillLeft
  | GridObjectPillRight
  | GridObjectPillBottom
  | GridObjectPillTop
  | GridObjectPillSegment
  | GridObjectVirus;

export type GridObjectPillHalf =
  | GridObjectPillLeft
  | GridObjectPillRight
  | GridObjectPillBottom
  | GridObjectPillTop;

export type GridObjectPillHalfType =
  | GridObjectType.PillLeft
  | GridObjectType.PillRight
  | GridObjectType.PillBottom
  | GridObjectType.PillTop;

export type GridObjectPillPart = GridObjectPillHalf | GridObjectPillSegment;

export type GridObjectPillPartType = GridObjectPillHalfType | GridObjectType.PillSegment;

export type MaybeGridObject = GridObject | null;
export type MaybeGridObjectWithColor = GridObjectWithColor | null;

export type GameGridRow = GridObject[];
export type GameGrid = GameGridRow[];

// todo use generics to make sure numbers are in range of grid?
export type GridCellLocation = [number, number];

export type GridCellLocationDelta = [number, number];

export type GridCellNeighbors = { [D in GridDirection]: MaybeGridObject };

export type PillLocation = [GridCellLocation, GridCellLocation];

export const tPillColors = t.tuple([tGameColor, tGameColor], "PillColors");
export type PillColors = t.TypeOf<typeof tPillColors>;
// export type PillColors = [GameColor, GameColor];

export type SpeedTable = { [S in SpeedLevel]: number };

export type ModeKeyBindings = { [I in GameInput]?: string | string[] };

// Subset of GameInputs which are moves
export const tGameInputMove = t.union(
  [
    t.literal(GameInput.Up),
    t.literal(GameInput.Down),
    t.literal(GameInput.Left),
    t.literal(GameInput.Right),
    t.literal(GameInput.RotateCCW),
    t.literal(GameInput.RotateCW)
  ],
  "GameInputMove"
);
export type GameInputMove = t.TypeOf<typeof tGameInputMove>;

// export type GameInputMove =
//   | GameInput.Up
//   | GameInput.Down
//   | GameInput.Left
//   | GameInput.Right
//   | GameInput.RotateCCW
//   | GameInput.RotateCW;

export type MoveInputNumberMap = { [I in GameInputMove]: number };

export interface MoveInputEvent {
  input: GameInputMove;
  eventType: InputEventType;
}

// game action types
// GameActions represent events from the "outside world" which affect game state
// these include our player's move inputs, as well as actions caused by other players
export enum GameActionType {
  Move = "Move",
  Garbage = "Garbage",
  Seed = "Seed",
  Defeat = "Defeat",
  ForfeitWin = "ForfeitWin"
}
export const tGameActionMove = t.interface(
  {
    type: t.literal(GameActionType.Move),
    input: tGameInputMove,
    eventType: tInputEventType
  },
  "GameActionMove"
);
export type GameActionMove = t.TypeOf<typeof tGameActionMove>;
// export interface GameActionMove {
//   type: GameActionType.Move;
//   input: GameInputMove;
//   eventType: InputEventType;
// }

export interface GameActionGarbage {
  type: GameActionType.Garbage;
  colors: GameColor[];
}
export interface GameActionSeed {
  type: GameActionType.Seed;
  seed: string;
}
export interface GameActionDefeat {
  type: GameActionType.Defeat;
}
export interface GameActionForfeitWin {
  type: GameActionType.ForfeitWin;
}
export type GameAction =
  | GameActionMove
  | GameActionGarbage
  | GameActionSeed
  | GameActionDefeat
  | GameActionForfeitWin;

// game tick result types
// GameTickResults are returned from game.tick() and represent events that happen in the game
// as the result of the game state + tick inputs.
// GameActions are the game's inputs and GameTickResults are the outputs.
export enum GameTickResultType {
  Win = "Win",
  Lose = "Lose",
  Garbage = "Garbage"
}
export interface GameTickResultWin {
  type: GameTickResultType.Win;
}
export interface GameTickResultLose {
  type: GameTickResultType.Lose;
}
export interface GameTickResultGarbage {
  type: GameTickResultType.Garbage;
  colors: GameColor[];
}
export type GameTickResult = GameTickResultWin | GameTickResultLose | GameTickResultGarbage;

// for network play, the game controllers emit pairs of [frame, actions/results]
// where `frame` is the game frame # on which they took place,
// so that the server/other clients can time/sync them appropriately
export type TimedGameActions = [number, GameAction[]];
export type TimedMoveActions = [number, GameActionMove[]];
export type TimedGameTickResult = [number, GameTickResult];

// options that can be passed to control game parameters
export interface GameOptions {
  level: number;
  baseSpeed: number;
  width: number;
  height: number;
  initialSeed?: string;
}

export type EncodableGameOptions = GameOptions;

export interface GameState {
  mode: GameMode;
  grid: GameGrid;
  pill?: PillLocation;
  nextPill: PillColors;
  movingCounters: MovingCounters;
  seed: string;
  frame: number;
  gameTicks: number;
  modeTicks: number;
  pillCount: number;
  score: number;
  timeBonus: number;
  // comboLineCount: number;
  lineColors: GameColor[];
}
