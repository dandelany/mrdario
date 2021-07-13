import { invariant } from "ts-invariant";
// import * as t from "io-ts";
import { isRight } from "fp-ts/lib/Either";

import { TimedGameActions } from "../../../game/types";
import { isMoveAction } from "../../../game/utils";
import { tEncodedInt } from "./game";
import { decodeMoveInputEvent, encodeMoveInputEvent } from "./move";
import { GameAction, GameActionMove, GameActionType } from "../../../game/types/gameAction";

export type ActionTypeEncodingMap = { [I in GameActionType]: string };

export type EncodedMoveAction = string;
export type EncodedAction = EncodedMoveAction | string;
export type EncodedTimedActions = string;

export const actionTypeCodes: ActionTypeEncodingMap = {
  [GameActionType.Move]: "M",
  [GameActionType.Garbage]: "G",
  [GameActionType.Seed]: "S",
  [GameActionType.Defeat]: "D",
  [GameActionType.ForfeitWin]: "W"
};

// export const tEncodedMoveAction = new t.Type<GameActionMove, string, unknown>()

export function encodeMoveAction(action: GameActionMove): EncodedMoveAction {
  const { input, eventType } = action;
  return `${actionTypeCodes[GameActionType.Move]}${encodeMoveInputEvent({ input, eventType })}`;
}
export function decodeMoveAction(encodedAction: EncodedMoveAction): GameActionMove {
  const { input, eventType } = decodeMoveInputEvent(encodedAction.slice(1));
  return { type: GameActionType.Move, input, eventType };
}
function isEncodedMoveAction(encodedAction: EncodedAction): encodedAction is EncodedMoveAction {
  return !!encodedAction.length && encodedAction[0] === actionTypeCodes[GameActionType.Move];
}

export function encodeAction(action: GameAction) {
  if (isMoveAction(action)) {
    return encodeMoveAction(action);
  } else {
    // todo encodings for other types
    return JSON.stringify(action);
  }
}
export function decodeAction(encodedAction: EncodedAction): GameAction {
  if (isEncodedMoveAction(encodedAction)) {
    return decodeMoveAction(encodedAction);
  } else {
    return JSON.parse(encodedAction);
  }
}

export function encodeTimedActions(timedActions: TimedGameActions): EncodedTimedActions {
  const [frame, actions] = timedActions;
  const encodedActions = actions.map(encodeAction);
  return `${tEncodedInt.encode(frame)}:${encodedActions.join("|")}`;
}
export function decodeTimedActions(encodedTimedActions: EncodedTimedActions): TimedGameActions {
  const splitArr = encodedTimedActions.split(":");
  invariant(splitArr.length === 2, `Invalid EncodedTimedActions: ${encodedTimedActions}`);
  const decodedFrame = tEncodedInt.decode(splitArr[0]);
  if (isRight(decodedFrame)) {
    const frame = decodedFrame.right;
    const actionStrings: EncodedAction[] = splitArr[1].split("|");
    const actions: GameAction[] = actionStrings.map(decodeAction);
    return [frame, actions];
  } else {
    throw new Error("");
  }
}
