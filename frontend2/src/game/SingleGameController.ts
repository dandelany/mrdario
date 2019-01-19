import * as _ from 'lodash';
import {create as createStateMachine, StateMachine} from 'javascript-state-machine';

import Game from './Game';

import {
  GameMode, GameInput, PLAYFIELD_WIDTH, PLAYFIELD_HEIGHT,
} from './constants';

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
    {name: 'play',   from: GameMode.Ready,   to: GameMode.Playing},
    {name: 'pause',  from: GameMode.Playing, to: GameMode.Paused},
    {name: 'resume', from: GameMode.Paused,  to: GameMode.Playing},
    {name: 'win',    from: GameMode.Playing, to: GameMode.Won},
    {name: 'lose',   from: GameMode.Playing, to: GameMode.Lost},
    {name: 'reset',  from: ['*'], to: GameMode.Ready},
    {name: 'end',    from: ['*'], to: GameMode.Ended}
  ];


  modeMachine?: StateMachine;

  constructor(options = {}) {
    options = _.defaults({}, options, SingleGameController.defaultOptions);
    // super(options);
    // assign all options to instance variables
    Object.assign(this, options);

    this.initGame();

    _.assign(this, {
      // a finite state machine representing game mode, & transitions between modes
      modeMachine: createStateMachine({
        init: GameMode.Ready,
        transitions: SingleGameController.modeTransitions,
        methods: {
          onEnterState: this._onChangeMode,
          onPlay: () => this.run(),
          onReset: () => this.initGame(),
          // tick to get the game started again after being paused
          onResume: () => this.tick()
        }
      }),
      // queued up move inputs which will processed on the next tick
      moveInputQueue: [],

      // time per tick step
      step: 1 / options.fps,
      // slow motion factor adjusted step time
      slowStep: options.slow * (1 / options.fps)
    });

    this.attachInputEvents();
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

  _onChangeMode = (lifecycle) => {
    // update mode of all input managers
    this.inputManagers.forEach(inputManager => inputManager.setMode(lifecycle.to));
    // re-render on any mode change
    this.render(this.getState(lifecycle.to));
    // call handler
    this.onChangeMode(lifecycle.transition, lifecycle.from, lifecycle.to);
  };

  attachInputEvents() {
    this.inputManagers.forEach(inputManager => {
      inputManager.on(GameInput.Play, () => this.modeMachine.play());
      inputManager.on(GameInput.Pause, (type) => {
        if(type === 'keydown') this.modeMachine.pause();
      });
      inputManager.on(GameInput.Resume, (type) => {
        if(type === 'keydown') this.modeMachine.resume();
      });
      inputManager.on(GameInput.Reset, () => this.modeMachine.reset());

      const moveInputs = [GameInput.Left, GameInput.Right, GameInput.Down, GameInput.Up, GameInput.RotateCCW, GameInput.RotateCW];
      moveInputs.forEach(input => inputManager.on(input, this.enqueueMoveInput.bind(this, input)));
    });
  }
  enqueueMoveInput(input, eventType, event) {
    // queue a user move, to be sent to the game on the next tick
    if (this.modeMachine.state !== GameMode.Playing) return;
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
    if(this.modeMachine.state !== GameMode.Playing) return;
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
    // const start = performance.now();
    this.game.tick(this.moveInputQueue);
    // const took = performance.now() - start;
    // if(took > 1) console.log('game tick took ', took);
    this.moveInputQueue = [];
  }

  getState(mode) {
    const {grid, pillCount, pillSequence, score, timeBonus} = this.game;
    // minimal description of game state to render
    return {
      mode: mode || this.modeMachine.state,
      pillCount: this.game.counters.pillCount,
      grid, pillSequence, score, timeBonus
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
