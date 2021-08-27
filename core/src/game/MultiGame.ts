import { EventEmitter } from "events";
import { defaults, includes } from "lodash";
import { TypeState } from "typestate";

import {
  GameColor,
  GameGrid,
  GameInput,
  GameInputMove,
  GameMode,
  GameOptions,
  GameState,
  GameTickResult,
  GameTickResultType,
  GridDirection,
  PillColors,
  PillLocation,
  RotateDirection
} from "./types";

export class MultiGame extends EventEmitter {

}
