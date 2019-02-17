import { AbstractGameController } from "./AbstractGameController";
import { GameAction, GameActionMove, GameActionType, GameControllerOptions, MoveInputEvent } from "../types";
import { Game, GameOptions, GameState } from "../Game";
import { findIndex, findLast, omitBy, isFunction, isEqual, cloneDeep} from "lodash";

type GameActionHistoryItem = [number, GameAction[]];
type GameActionHistory = GameActionHistoryItem[];

// type GameStateHistoryItem = [number, GameState];
// type GameStateHistory = GameStateHistoryItem[];
type GameStateHistory = GameState[];

export abstract class GameControllerWithHistory extends AbstractGameController {
  protected actionHistory: GameActionHistory;
  protected stateHistory: GameStateHistory;
  protected initialGameState: GameState;
  constructor(passedOptions: Partial<GameControllerOptions> = {}) {
    super(passedOptions);

    this.actionHistory = [];
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
      const actionHistoryItem: GameActionHistoryItem = [this.game.frame, actions];
      console.log("history item", actionHistoryItem);
      this.actionHistory.push(actionHistoryItem);
      this.stateHistory.push(cloneDeep(this.game.getState()));
      // todo
      // console.log(this.actionHistory, this.stateHistory);
    }
    this.moveInputQueue = [];
  }
  protected rewindToFrame(frame: number) {
    const restoreState = findLast(this.stateHistory, gameState => gameState.frame <= frame);
    if (restoreState !== undefined) {
      this.game.setState(restoreState);
      while (this.game.frame < frame) {
        this.game.tick();
      }
    } else {
      throw new Error(`Could not rewind to frame ${frame} - current frame is ${this.game.frame}`);
    }
  }
  protected tickGameToFrame(frame: number, game: Game): void {
    if (frame < game.frame) throw new Error(`Game is at frame ${game.frame} - cannot tick to ${frame}`);
    if (frame === game.frame) return;
    while (frame > game.frame) game.tick();
  }

  public replayHistory() {
    // make a dummy game which we can use to replay the game history without triggering any callbacks
    // use the same options as this.game but omit callbacks
    const dummyOptions: Partial<GameOptions> = omitBy(this.game.options, isFunction);
    const dummyGame = new Game(dummyOptions);

    const currentFrame = this.game.frame;

    // reset game state to the first state we have saved
    dummyGame.setState(cloneDeep(this.initialGameState));

    // find the first action in actionHistory which happens after the game's current frame
    let nextActionsItemIndex = findIndex(this.actionHistory, ([frame]) => frame > dummyGame.frame);
    // tick through the game, applying actions in actionHistory to appropriate frames
    while (nextActionsItemIndex > -1) {
      const [nextActionsFrame, nextActions] = this.actionHistory[nextActionsItemIndex];
      if(nextActionsFrame > currentFrame) break;
      this.tickGameToFrame(nextActionsFrame - 1, dummyGame);
      dummyGame.tick(nextActions);
      // get the next action in history, or break out of loop if we've done them all
      nextActionsItemIndex =
        nextActionsItemIndex >= this.actionHistory.length - 1 ? -1 : nextActionsItemIndex + 1;
    }
    // game is now at the frame of the last action in actionHistory before currentFrame
    // no more actions - tick ahead to target frame
    this.tickGameToFrame(currentFrame, dummyGame);

    // todo send error to backend?
    if(!isEqual(this.game.getState(), dummyGame.getState()))
      console.error("states not equal: ", this.game.getState(), dummyGame.getState());
  }
}
