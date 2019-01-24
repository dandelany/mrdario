import {
  Direction,
  GameColor,
  GameControllerMode,
  GameInput,
  GridObjectType,
  InputEventType,
  SpeedLevel
} from "./enums";
export * from "./enums";

export * from "./GameController";

export type Tuple<TItem, TLength extends number> = TItem[] & { length: TLength };

export type OneOrMore<T> = { 0: T } & T[];

export interface GridObjectBase {
  type: GridObjectType;
}
export interface GridObjectWithColor extends GridObjectBase {
  color: GameColor;
}
export interface GridObjectWithFalling extends GridObjectWithColor {
  isFalling?: boolean;
}

export interface GridObjectDestroyed extends GridObjectBase {
  type: GridObjectType.Destroyed;
}
export interface GridObjectEmpty extends GridObjectBase {
  type: GridObjectType.Empty;
}
export interface GridObjectPillLeft extends GridObjectWithFalling {
  type: GridObjectType.PillLeft;
}
export interface GridObjectPillRight extends GridObjectWithFalling {
  type: GridObjectType.PillRight;
}
export interface GridObjectPillBottom extends GridObjectWithFalling {
  type: GridObjectType.PillBottom;
}
export interface GridObjectPillTop extends GridObjectWithFalling {
  type: GridObjectType.PillTop;
}
export interface GridObjectPillSegment extends GridObjectWithFalling {
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

export type GridCellNeighbors = { [D in Direction]: MaybeGridObject };

export type PillLocation = [GridCellLocation, GridCellLocation];
export type PillColors = [{ color: GameColor }, { color: GameColor }];

export type SpeedTable = { [S in SpeedLevel]: number };

export type ModeKeyBindings = {[I in GameInput]?: string | string[] };
export type KeyBindings = { [M in GameControllerMode]?: ModeKeyBindings };

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

// todo figure out eventemitter
// interface InputManager extends EventEmitter {
export interface InputManager {
  setMode: (mode: GameControllerMode) => any;
  // on: (input: GameInput, callback: (inputType: GameInput, keyType: InputEventType, event: Event) => any) => any;
  on: (input: GameInput, callback: (keyType: InputEventType) => any) => any;
  removeAllListeners: () => any;
}
