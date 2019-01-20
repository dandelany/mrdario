import { GameInput, GameMode, GridObjectType, SpeedLevel, GameColor, Direction } from "./enums";

export type Tuple<TItem, TLength extends number> = TItem[] & { length: TLength };

export type OneOrMore<T> = { 0: T } & Array<T>;

export interface GridObjectBase {
  type: GridObjectType;
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

export type MaybeGridObject = GridObject | null;
export type MaybeGridObjectWithColor = GridObjectWithColor | null;

export type GameGridRow<Width extends number> = Tuple<GridObject, Width>;

// todo why do i have to write this as GameGrid<number, number> everywhere...
export type GameGrid<Width extends number, Height extends number> = Tuple<GameGridRow<Width>, Height>;

// todo use generics to make sure numbers are in range of grid?
export type GridCellLocation = [number, number];

export type GridPillLocation = [GridCellLocation, GridCellLocation];

export type GridCellLocationDelta = [number, number];

export type GridCellNeighbors = {
  [D in Direction]: MaybeGridObject
}


export type PillColors = [{ color: GameColor }, { color: GameColor }];

export type SpeedTable = { [S in SpeedLevel]: number };

export type KeyBindings = { [M in GameMode]?: { [I in GameInput]?: string | string[] } };

export * from "./enums";
