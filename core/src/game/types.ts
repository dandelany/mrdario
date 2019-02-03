import { GameColor, GameInput, GridDirection, GridObjectType, InputEventType, SpeedLevel } from "./enums";

export * from "./enums";

export * from "@/game/controller/types";

export type OneOrMore<T> = { 0: T } & T[];

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
export type PillColors = [{ color: GameColor }, { color: GameColor }];

export type SpeedTable = { [S in SpeedLevel]: number };

export type ModeKeyBindings = { [I in GameInput]?: string | string[] };

export type GameInputMove =
  | GameInput.Up
  | GameInput.Down
  | GameInput.Left
  | GameInput.Right
  | GameInput.RotateCCW
  | GameInput.RotateCW;

export type MoveInputNumberMap = { [I in GameInputMove]: number };

export interface MoveInputEvent {
  input: GameInputMove;
  eventType: InputEventType;
}
