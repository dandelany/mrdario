import { GameAction, GameActionMove, GameActionType, TimedGameActions } from "../game";
import { encodeMoveInputEvent } from "./move";
import { encodeInt } from "./game";
import { isMoveAction } from "../game/utils";

export type ActionTypeEncodingMap = { [I in GameActionType]: string };

export const actionTypeEncodingMap: ActionTypeEncodingMap = {
  [GameActionType.Move]: "M",
  [GameActionType.Garbage]: "G",
  [GameActionType.Seed]: "S",
  [GameActionType.Defeat]: "D",
  [GameActionType.ForfeitWin]: "W"
};

export function encodeMoveAction(action: GameActionMove) {
  const { eventType, input } = action;
  const encodedEvent = encodeMoveInputEvent({ eventType, input });
  return `M${encodedEvent}`;
}

export function encodeAction(action: GameAction) {
  if (isMoveAction(action)) {
    return encodeMoveAction(action);
  } else {
    // todo encodings for other types
    return JSON.stringify(action);
  }
}

export function encodeTimedActions(timedActions: TimedGameActions) {
  const [frame, actions] = timedActions;
  let encodedActions = actions.map(encodeAction);
  return `${encodeInt(frame)}:${encodedActions.join(',')}`;
}
