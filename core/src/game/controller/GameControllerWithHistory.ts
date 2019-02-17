import { AbstractGameController } from "./AbstractGameController";
import {
  GameActionMove,
  GameActionType,
  GameControllerOptions,
  MoveInputEvent,
  TimedGameActions
} from "../types";
import { Game, GameOptions, GameState } from "../Game";
import { cloneDeep, findIndex, findLast, findLastIndex, isEqual, isFunction, omitBy } from "lodash";
import { encodeTimedActions } from "../../encoding/action";

export abstract class GameControllerWithHistory extends AbstractGameController {
  protected actionHistory: TimedGameActions[];
  public futureActions: TimedGameActions[];
  protected stateHistory: GameState[];
  protected initialGameState: GameState;

  constructor(passedOptions: Partial<GameControllerOptions> = {}) {
    super(passedOptions);
    this.actionHistory = [];
    this.futureActions = [];
    this.stateHistory = [];
    this.initialGameState = this.game.getState();
  }

  public tickGame() {
    // tick the game, sending current queue of moves
    // todo have inputmanagers return actions instead of MoveInputEvents
    const actions = this.moveInputQueue.map(
      (inputEvent: MoveInputEvent): GameActionMove => {
        return { type: GameActionType.Move, ...inputEvent };
      }
    );
    this.game.tick(actions);

    if (actions.length) {
      const actionHistoryItem: TimedGameActions = [this.game.frame, actions];
      console.log("history item", actionHistoryItem);
      this.actionHistory.push(actionHistoryItem);
      // todo still need to cloneDeep?
      this.stateHistory.push(cloneDeep(this.game.getState()));

      console.log(this.actionHistory.map(item => encodeTimedActions(item)).join(";"));
      // todo
      // console.log(this.actionHistory, this.stateHistory);
    }
    this.moveInputQueue = [];
  }

  protected makeDummyGame(state?: GameState) {
    // make a dummy game which we can use to replay the game history without triggering any callbacks
    // use the same options as this.game but omit callbacks
    const dummyOptions: Partial<GameOptions> = omitBy(this.game.options, isFunction);
    const dummyGame = new Game(dummyOptions);
    if (state) dummyGame.setState(state);
    return dummyGame;
  }
  protected rewindGameToFrame(game: Game, frame: number) {
    const restoreState = findLast(this.stateHistory, gameState => gameState.frame <= frame);
    if (restoreState !== undefined) {
      game.setState(restoreState);
      while (game.frame < frame) {
        game.tick();
      }
    } else {
      throw new Error(`Could not rewind to frame ${frame} - current frame is ${this.game.frame}`);
    }
  }

  public replayHistory() {
    const dummyGame = this.makeDummyGame(cloneDeep(this.initialGameState));

    const currentFrame = this.game.frame;

    // find the first action in actionHistory which happens after the game's current frame
    let nextActionsItemIndex = findIndex(this.actionHistory, ([frame]) => frame > dummyGame.frame);
    // tick through the game, applying actions in actionHistory to appropriate frames
    while (nextActionsItemIndex > -1) {
      const [nextActionsFrame, nextActions] = this.actionHistory[nextActionsItemIndex];
      if (nextActionsFrame > currentFrame) break;
      tickGameToFrame(dummyGame, nextActionsFrame - 1);
      dummyGame.tick(nextActions);
      // get the next action in history, or break out of loop if we've done them all
      nextActionsItemIndex =
        nextActionsItemIndex >= this.actionHistory.length - 1 ? -1 : nextActionsItemIndex + 1;
    }
    // game is now at the frame of the last action in actionHistory before currentFrame
    // no more actions - tick ahead to target frame
    tickGameToFrame(dummyGame, currentFrame);

    // todo send error to backend?
    if (!isEqual(this.game.getState(), dummyGame.getState()))
      console.error("states not equal: ", this.game.getState(), dummyGame.getState());
  }

  protected rewriteHistoryWithActions(frameActions: TimedGameActions) {
    const [frame] = frameActions;
    const currentFrame = this.game.frame;
    // make a dummy game with the last saved state before timedActions
    const dummyGame = this.makeDummyGame();
    this.rewindGameToFrame(dummyGame, frame - 1);

    // insert new frameActions at the correct place in this.actionHistory
    addFrameActionsToList(frameActions, this.actionHistory);
    // all of our state history after (frame - 1) is no longer valid - remove them from stateHistory
    const firstInvalidStateIndex = findLastIndex(this.stateHistory, state => state.frame >= frame);
    this.stateHistory.splice(firstInvalidStateIndex, this.stateHistory.length - firstInvalidStateIndex);

    // find the earliest action(s) in actionHistory which happen after the game's current frame
    let nextActionsIndex = this.actionHistory.findIndex(([actionsFrame]) => actionsFrame > dummyGame.frame);
    // tick through the game, applying actions in actionHistory to appropriate frames
    while (nextActionsIndex > -1) {
      const [nextActionsFrame, nextActions] = this.actionHistory[nextActionsIndex];
      if (nextActionsFrame > currentFrame) break;
      tickGameToFrame(dummyGame, nextActionsFrame - 1);
      dummyGame.tick(nextActions);
      // add post-tick game state to stateHistory
      // todo refactor to not need cloneDeep?
      this.stateHistory.push(cloneDeep(dummyGame.getState()));

      // get the next action in history, or break out of loop if we've done them all
      nextActionsIndex = nextActionsIndex >= this.actionHistory.length - 1 ? -1 : nextActionsIndex + 1;
    }
    // dummyGame is now at the frame of the last action in actionHistory before currentFrame
    // no more actions - tick ahead to the current frame
    tickGameToFrame(dummyGame, currentFrame);
    // done - dummyGame is at same frame as this.game, but has frameActions in its history
    // update this.game state to dummyGame's state
    this.game.setState(dummyGame.getState());
  }

  public addFrameActions(frameActions: TimedGameActions) {
    const [frame] = frameActions;
    if (frame > this.game.frame) {
      // action(s) are in the future, add them to the future actions queue
      console.log("adding future action for frame:", frame);
      addFrameActionsToList(frameActions, this.futureActions);
    } else {
      // action(s) are in past (or present) tick
      // update the game state by rewriting game history to include the past actions
      console.log("action happened in past frame:", frame);
      this.rewriteHistoryWithActions(frameActions);
    }
  }
}

function tickGameToFrame(game: Game, frame: number): void {
  if (frame < game.frame) throw new Error(`Game is at frame ${game.frame} - cannot tick to ${frame}`);
  if (frame === game.frame) return;
  while (frame > game.frame) game.tick();
}

function addFrameActionsToList(frameActions: TimedGameActions, actionsList: TimedGameActions[]): void {
  // mutate actionsList to add frameActions at correct place in the list, merging with existing actions if necessary
  const [addedFrame, addedActions] = frameActions;
  // find first item in list with frame >= the one we're adding
  const spliceIndex = actionsList.findIndex(([frame]) => frame >= addedFrame);
  if (spliceIndex < 0) {
    // didn't find any actions at same time or after ours - add to end of list
    actionsList.push(frameActions);
  } else {
    const [nextFrame, nextActions] = actionsList[spliceIndex];
    if (nextFrame === addedFrame) {
      // already have action(s) on the same frame, merge the lists
      const mergedActions = [...nextActions, ...addedActions];
      actionsList[spliceIndex] = [addedFrame, mergedActions];
    } else {
      // next item in the list is after addedFrame, insert item in the list before it
      actionsList.splice(spliceIndex, 0, frameActions);
    }
  }
}
