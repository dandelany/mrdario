import * as t from "io-ts";

import { numEnumType, strEnumType } from "../../utils/io";
import { GameColor, GameInput, GameMode, GridDirection, GridObjectType, InputEventType, SpeedLevel } from "../enums";
import { MovingCounters } from "../InputRepeater";

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
export type TGridObjectDestroyed = t.TypeOf<typeof tGridObjectDestroyed>;

export const tGridObjectEmpty = t.type({
  type: t.literal(GridObjectType.Empty)
});
export type TGridObjectEmpty = t.TypeOf<typeof tGridObjectEmpty>;

export const tGridObjectPillLeft = t.type({
  type: t.literal(GridObjectType.PillLeft),
  color: tGameColor
});
export type TGridObjectPillLeft = t.TypeOf<typeof tGridObjectPillLeft>;

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



// game tick result types
// GameTickResults are returned from game.tick() and represent events that happen in the game
// as the result of the game state + tick inputs.
// GameActions are the game's inputs and GameTickResults are the outputs.
export enum GameTickResultType {
  Win = "Win",
  Lose = "Lose",
  // emit a garbage result when you get a
  Combo = "Combo"
}
export interface GameTickResultWin {
  type: GameTickResultType.Win;
}
export interface GameTickResultLose {
  type: GameTickResultType.Lose;
}
export interface GameTickResultGarbage {
  type: GameTickResultType.Combo;
  colors: GameColor[];
}
export type GameTickResult = GameTickResultWin | GameTickResultLose | GameTickResultGarbage;

// for network play, the game controllers emit pairs of [frame, result]
// where `frame` is the game frame # on which they took place,
// so that the server/other clients can time/sync them appropriately
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
  lineColors: GameColor[];
  garbage: GameColor[];
}
