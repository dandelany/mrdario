import { GameControllerMode, GameInput, GridObjectType, KeyBindings } from "mrdario-core/lib/types";
import { GridObjectStringMap } from "./types";

export const GRID_OBJECT_STRINGS: GridObjectStringMap = {
  // [GridObjectType.Empty]: '░░',
  [GridObjectType.Empty]: '░░',
  [GridObjectType.Virus]: '%@',
  [GridObjectType.PillSegment]: '▒▒',
  [GridObjectType.PillBottom]: '▒▒',
  [GridObjectType.PillTop]: '▒▒',
  [GridObjectType.PillLeft]: '▒▒',
  [GridObjectType.PillRight]: '▒▒',
  [GridObjectType.Destroyed]: '**',
};

export const KEY_BINDINGS: KeyBindings = {
  [GameControllerMode.Playing]: {
    [GameInput.Left]: 'left',
    [GameInput.Right]: 'right',
    [GameInput.Up]: 'up',
    [GameInput.Down]: 'down',
    [GameInput.RotateCCW]: 'a',
    [GameInput.RotateCW]: 's',
  }
};
