import _ from 'lodash';
import StateMachine from 'javascript-state-machine';
import io from 'socket.io-client';

import Game from 'game/Game';
import SingleGameController from './SingleGameController.js'

import {
  PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
  GameMode, GameInput, GridObject, COLORS, DEFAULT_KEYS
} from './constants';

// a game controller class for the basic 1-player game, played entirely on the client (in browser)
// controls the frame timing and must tick the Game object once per frame
// controls the high-level game state and must call render() when game state changes

export default class MasterClientGameController extends SingleGameController {
  constructor(options = {}) {
    super(options);
  }
  tickGame() {
    // if there are pending moves, send them via socket
    if(this.moveInputQueue.length) this.socket.emit('moves', this.moveInputQueue);
    // tick the game, sending current queue of moves
    super.tickGame();
  }
}
