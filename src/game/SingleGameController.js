import _ from 'lodash';
import React from 'react';
import StateMachine from 'javascript-state-machine';

import Game from 'game/Game';

import {
  MODES, INPUTS, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
} from 'constants';

// a game controller class for the basic 1-player game, played entirely on the client (in browser)
// controls the frame timing and must tick the Game object once per frame
// handles inputs and passes them into the Game
// controls the high-level game state and must call render() when game state changes

export default class SingleGameController {

  // options that can be passed to control game parameters
  static defaultOptions = {
    // list of input managers, eg. of keyboard, touch events
    // these are event emitters that fire on every user game input (move)
    // moves are queued and fed into the game to control it
    inputManagers: [],
    // render function which is called when game state changes
    // this should be the main connection between game logic and presentation
    render: _.noop,
    // callback called when state machine mode changes
    onChangeMode: _.noop,
    // current virus level (generally 1-20)
    level: 0,
    // pill fall speed
    speed: 15,
    // width and height of the playfield grid, in grid units
    height: PLAYFIELD_HEIGHT,
    width: PLAYFIELD_WIDTH,
    // frames (this.tick/render calls) per second
    fps: 60,
    // slow motion factor, to simulate faster/slower gameplay for debugging
    slow: 1
  };

  // transitions between modes (state machine states)
  static modeTransitions = [
    {name: 'play',   from: MODES.READY,   to: MODES.PLAYING},
    {name: 'pause',  from: MODES.PLAYING, to: MODES.PAUSED},
    {name: 'resume', from: MODES.PAUSED,  to: MODES.PLAYING},
    {name: 'win',    from: MODES.PLAYING, to: MODES.WON},
    {name: 'lose',   from: MODES.PLAYING, to: MODES.LOST},
    {name: 'reset',  from: ['*'], to: MODES.READY},
    {name: 'end',    from: ['*'], to: MODES.ENDED}
  ];

  constructor(options = {}) {
    options = _.defaults({}, options, SingleGameController.defaultOptions);
    // super(options);
    // assign all options to instance variables
    Object.assign(this, options);

    _.assign(this, {
      // a finite state machine representing game mode, & transitions between modes
      modeMachine: StateMachine.create({
        initial: MODES.READY,
        events: SingleGameController.modeTransitions
      }),
      // queued up move inputs which will processed on the next tick
      moveInputQueue: [],

      // time per tick step
      step: 1 / options.fps,
      // slow motion factor adjusted step time
      slowStep: options.slow * (1 / options.fps)
    });

    this.initGame();
    this.attachModeEvents();
    this.attachInputEvents();
    this._onChangeMode(null, null, MODES.READY);
  }
  
  initGame() {
    const {width, height, level, speed} = this;
    this.game = new Game({
      width, height,
      level,
      baseSpeed: speed,
      onWin: () => this.modeMachine.win(),
      onLose: () => this.modeMachine.lose()
    });
  }

  _onChangeMode = (event, lastMode, newMode) => {
    // update mode of all input managers
    this.inputManagers.forEach(inputManager => inputManager.setMode(newMode));
    // call handler
    this.onChangeMode(event, lastMode, newMode);
    // re-render on any mode change
    this.render(this.getState());
  };

  attachModeEvents() {
    this.modeMachine.onenterstate = this._onChangeMode;
    this.modeMachine.onplay = () => this.run();
    this.modeMachine.onreset = () => this.initGame();
  }
  attachInputEvents() {
    this.inputManagers.forEach(inputManager => {
      inputManager.on(INPUTS.PLAY, () => this.modeMachine.play());
      inputManager.on(INPUTS.PAUSE, () => this.modeMachine.pause());
      inputManager.on(INPUTS.RESUME, () => this.modeMachine.resume());
      inputManager.on(INPUTS.RESET, () => this.modeMachine.reset());

      const moveInputs = [INPUTS.LEFT, INPUTS.RIGHT, INPUTS.DOWN, INPUTS.UP, INPUTS.ROTATE_CCW, INPUTS.ROTATE_CW];
      moveInputs.forEach(input => inputManager.on(input, this.enqueueMoveInput.bind(this, input)));
    });
  }
  enqueueMoveInput(input, eventType, event) {
    // queue a user move, to be sent to the game on the next tick
    if (this.modeMachine.current !== MODES.PLAYING) return;
    this.moveInputQueue.push({input, eventType});
    if(event.preventDefault) event.preventDefault();
  }

  play() {
    this.modeMachine.play();
  }

  run() {
    // called when gameplay starts, to initialize the game loop
    _.assign(this, {dt: 0, last: timestamp()});
    requestAnimationFrame(this.tick.bind(this));
  }

  tick() {
    // called once per frame
    if(this.modeMachine.current !== MODES.PLAYING) return;
    const now = timestamp();
    const {dt, last, slow, slowStep} = this;

    // allows the number of ticks to stay consistent
    // even if FPS changes or lags due to performance
    this.dt = dt + Math.min(1, (now - last) / 1000);
    while(this.dt > slowStep) {
      this.dt = this.dt - slowStep;
      this.tickGame();
    }

    // render with the current game state
    this.render(this.getState(), this.dt/slow);
    this.last = now;
    requestAnimationFrame(this.tick.bind(this));
  }
  tickGame() {
    // tick the game, sending current queue of moves
    this.game.tick(this.moveInputQueue);
    this.moveInputQueue = [];
  }

  getState() {
    // minimal description of game state to render
    return {
      mode: this.modeMachine.current,
      grid: this.game.playfield.grid
    };
  }

  cleanup() {
    // cleanup the game when we're done
    this.modeMachine.end();
    this.inputManagers.forEach(manager => manager.removeAllListeners());
  }
}

function timestamp() {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}
