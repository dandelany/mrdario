import * as t from "io-ts";
import { strEnumType } from "../../utils/io";
import { GameControllerMode } from "../../game/controller";

export interface GameListItem {
  id: string;
  creator: string;
  initialSeed: string;
  level: number;
  speed: number;
  // players?
}

export const tGameControllerMode = strEnumType<GameControllerMode>(GameControllerMode, "GameControllerMode");

// types of event requests/responses emitted by the game module

export const TCreateSingleGameRequest = t.exact(
  t.type(
    {
      level: t.number,
      baseSpeed: t.number
    },
    "CreateSingleGameRequest"
  )
);
export type CreateSingleGameRequest = t.TypeOf<typeof TCreateSingleGameRequest>;

export const TCreateSingleGameResponse = t.exact(
  t.type({
    id: t.string,
    creator: t.string,
    gameOptions: t.type({
      initialSeed: t.string,
      level: t.number,
      baseSpeed: t.number
    })
  })
);
export type CreateSingleGameResponse = t.TypeOf<typeof TCreateSingleGameResponse>;

export const tSingleGameMoveMessage = t.string;
export type SingleGameMoveMessage = t.TypeOf<typeof tSingleGameMoveMessage>;

export const tSingleGameModeChangeMessage = tGameControllerMode;
export type SingleGameModeChangeMessage = t.TypeOf<typeof tSingleGameModeChangeMessage>;
