import _ from 'lodash';
import StateMachine from 'javascript-state-machine';
import io from 'socket.io-client';

import Game from 'game/Game';
import PlayerControls from 'game/PlayerControls';
import SinglePlayerGameController from 'game/SinglePlayerGameController'

import {
    PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
    MODES, INPUTS, GRID_OBJECTS, COLORS, DEFAULT_KEYS
} from 'constants';


import Immutable from 'immutable';
window.Immutable = Immutable;

// a game controller class for the basic 1-player game, played entirely on the client (in browser)
// controls the frame timing and must tick the Game object once per frame
// controls the high-level game state and must call render() when game state changes

export default class SinglePlayerNetworkGameController extends SinglePlayerGameController {
    constructor({
        render = _.noop, fps = 60, slow = 1,
        level = 0, speed = 15,
        keyBindings = DEFAULT_KEYS,
        width = PLAYFIELD_WIDTH, height = PLAYFIELD_HEIGHT,
        socket = io('http://localhost:3000')
    } = {}) {
        super({render, fps, slow, level, speed, keyBindings, width, height});
        Object.assign(this, {socket});
    }
    tickGame() {
        // if there are pending moves, send them via socket
        if(this.moveInputQueue.length) this.socket.emit('moves', this.moveInputQueue);
        // tick the game, sending current queue of moves
        super.tickGame();
    }
}
