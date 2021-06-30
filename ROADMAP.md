## Roadmap/Planning

### `Game` class - done(ish)
* `Game` contains core game logic for *all* types of games below
    - `Game` represents a *single* game/playfield, multiplayer games have multiple `Game` instances
    - `Game` has no timer, it has a `tick()` method which must be called by an external `GameController` for each frame
    - `GameController` uses `InputManager`s to listen for user inputs and turn them into move actions
    - `GameController` calls `tick(actions)` to compute the state of the game in the next frame
    - Besides moves, other actions are `Defeat` and `ForfeitWin`, passed if you win/lose because of another player
    - `tick()` returns 
    

### `GameController` class
* `GameController` responsibilities
    - Create & control `Game` object(s)
    - Run main game timer/clock, call `game.tick(actions)` ~60 times per second
    - For multiplayer game, one controller instance creates/controls multiple `Game` instances
    - Use `InputManager`s to listen for local user inputs, turn them into move actions and pass to `Game`
    - For network multiplayer games, implement delay and "time travel"
        - May receive actions from other player which happened on a past frame (due to lag) and must be added to the game's history
        - "Rewind" the game to just before that frame, then replay it as if the action happened in the past
        - To limit "glitching" due to time travel/replay, run remote games with a slight delay compared to local
        - Delay means we must also be able to queue up "future" game actions which arrive faster than the delay
        
        
### `MatchController` class
    
    
### GameController rewrite

* Types of games
    - Single player local
        - Can play offline, but won't save high scores
    - Single player network
        - Online single player, must connect to server first
        - Server sends game seed to client
        - Client plays locally but sends moves to server on socket
        - Server verifies moves & results before saving high score
    - Single player spectator
        - Single network games can be watched live if public
        - Client subscribes to socket stream of moves(?)
        - Must be able to get initial game state on page load
    - Multiplayer local
        - Two players should be able to play vs. each other on the same screen
    - Multiplayer network game
        - Two players playing online & sending moves/actions to server on socket
        - Authoritative server computes/verifies final game state & sends actions/results to clients
    - Multiplayer network spectator
        - Same as single spectator, other users can watch multiplayer game

#### GameController types:
* Base GameController (WIP: GameController2.ts)
* Can combine single player & multiplayer into one controller? (ideally)
    - ie. only difference is `players` option
* 4(?) types of game controller: Local, Client, Server, Spectator

* SingleLocal
* SingleClient
* SingleServer
* SingleSpectator
* MultiplayerLocal
* MultiplayerClient
* MultiplayerServer



### Other TODO...
* Design work
    - Home page, how to select game type
    - Login
    - Challenge
* Deprecate io-ts types, switch back to typescript types(?)
    - how to validate messages?
    
    
    
// todo docs
spec? dev guide?

