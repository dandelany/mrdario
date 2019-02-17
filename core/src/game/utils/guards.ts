import {
  GameAction, GameActionMove, GameActionType,
  GameColor,
  GridObject,
  GridObjectDestroyed,
  GridObjectEmpty,
  GridObjectPillBottom,
  GridObjectPillHalf,
  GridObjectPillLeft,
  GridObjectPillPart,
  GridObjectPillRight,
  GridObjectPillSegment,
  GridObjectPillTop,
  GridObjectType,
  GridObjectWithColor,
  MaybeGridObject,
  MaybeGridObjectWithColor,
  PillLocation
} from "../types";

export function isGridObject(obj: MaybeGridObject): obj is GridObject {
  return !!obj && obj.type !== undefined;
}
export function isObjType(obj: MaybeGridObject, type: GridObjectType): boolean {
  return !!obj && obj.type === type;
}
export function hasColor(obj: GridObject | GridObjectWithColor): obj is GridObjectWithColor {
  return (obj as GridObjectWithColor).color !== undefined;
}
export function isColor(obj: MaybeGridObjectWithColor, color: GameColor): boolean {
  return !!obj && hasColor(obj) && obj.color === color;
}
export function isEmpty(obj: MaybeGridObject): obj is GridObjectEmpty {
  return isObjType(obj, GridObjectType.Empty);
}
export function isDestroyed(obj: MaybeGridObject): obj is GridObjectDestroyed {
  return isObjType(obj, GridObjectType.Destroyed);
}
export function isPillTop(obj: MaybeGridObject): obj is GridObjectPillTop {
  return isObjType(obj, GridObjectType.PillTop);
}
export function isPillBottom(obj: MaybeGridObject): obj is GridObjectPillBottom {
  return isObjType(obj, GridObjectType.PillBottom);
}
export function isPillLeft(obj: MaybeGridObject): obj is GridObjectPillLeft {
  return isObjType(obj, GridObjectType.PillLeft);
}
export function isPillRight(obj: MaybeGridObject): obj is GridObjectPillRight {
  return isObjType(obj, GridObjectType.PillRight);
}
export function isPillSegment(obj: MaybeGridObject): obj is GridObjectPillSegment {
  return isObjType(obj, GridObjectType.PillSegment);
}
export function isVirus(obj: MaybeGridObject): obj is GridObjectPillTop {
  return isObjType(obj, GridObjectType.Virus);
}
export function isPillHalf(obj: MaybeGridObject): obj is GridObjectPillHalf {
  return (
    !!obj &&
    (isObjType(obj, GridObjectType.PillLeft) ||
      isObjType(obj, GridObjectType.PillRight) ||
      isObjType(obj, GridObjectType.PillTop) ||
      isObjType(obj, GridObjectType.PillBottom))
  );
}
export function isPillPart(obj: MaybeGridObject): obj is GridObjectPillPart {
  return !!obj && (isPillHalf(obj) || isObjType(obj, GridObjectType.PillSegment));
}
export function isPillLocation(obj: PillLocation | undefined | null): obj is PillLocation {
  return !!obj;
}

export function isMoveAction(action: GameAction): action is GameActionMove {
  return action.type === GameActionType.Move;
}
