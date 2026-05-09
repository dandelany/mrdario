# UEFN Port Spec

Notes for porting Mr. Dario core gameplay to Verse / UEFN.

## Goal

Build a Fortnite-playable version of Mr. Dario by porting the deterministic game simulation to Verse, then rendering that state with UEFN devices / props / meshes.

The first milestone should be boring:

- one local board
- fixed seed
- keyboard/controller/button-device input mapped to game actions
- grid rendered as meshes
- deterministic tick loop
- win/loss/combo results visible enough for debugging

Multiplayer should come after the single-board simulation is trustworthy.

## Core Principle

Do not port the web app.

Port the simulation contract:

- `Game`
- `MultiGame`
- grid utils
- action/result types
- deterministic tick behavior

Renderer, input devices, Fortnite player mapping, cameras, UI, meshes, and effects should sit outside the simulation.

## Useful Verse Facts

References:

- Epic arrays doc: https://dev.epicgames.com/documentation/en-us/uefn/array-in-verse
- Epic classes doc: https://dev.epicgames.com/documentation/en-us/uefn/class-in-verse
- Epic enum doc: https://dev.epicgames.com/documentation/en-us/uefn/enum-in-verse
- Book of Verse: https://verselang.github.io/book/

Current assumptions from docs:

- arrays are immutable values
- `var` arrays can be reassigned, and element updates create a new array under the hood
- 2D arrays are represented as `[][]t`
- array indexing is failable, so grid access should go through helper functions
- structs are good for simple value records
- enums are closed by default, which is probably right for cell/mode/action enums
- classes are useful for stateful devices/managers, but simple game records may be better as structs

The Book of Verse is explicitly an early draft, so prefer Epic docs when syntax details conflict.

## Type Mapping

Likely Verse equivalents:

- `GameColor` -> closed enum
- `GameMode` -> closed enum
- `GridDirection` / `RotateDirection` -> closed enum
- `GameInput` -> closed enum
- `InputEventType` -> closed enum
- `GridCellLocation` -> struct `{ Row:int, Col:int }`
- `PillLocation` -> struct `{ A:grid_cell_location, B:grid_cell_location }`
- `PillColors` -> struct `{ A:game_color, B:game_color }`
- `GameGrid` -> `[][]grid_object`
- `GameState` -> struct or class, TBD
- `GameAction` -> probably tagged struct shape, not inheritance
- `GameTickResult` -> tagged struct shape

Open question:

- Verse enum payloads may not work like TypeScript discriminated unions. We may need structs with `Kind:action_kind` plus optional-ish fields, or separate action structs with conversion helpers.

## Grid Representation

Best first shape:

```text
grid_object_kind := enum { Empty, Destroyed, PillTop, PillBottom, PillLeft, PillRight, PillSegment, Virus }

grid_object := struct:
    Kind : grid_object_kind
    Color : ?game_color
```

This is slightly less type-perfect than TypeScript, where only colored cells have `color`, but much easier in Verse.

Use helper constructors:

- `MakeEmpty()`
- `MakeDestroyed()`
- `MakeVirus(Color)`
- `MakePillLeft(Color)`
- `MakePillRight(Color)`
- `MakePillSegment(Color)`

Use helper predicates:

- `HasColor(Obj)`
- `IsEmpty(Obj)`
- `IsVirus(Obj)`
- `IsPillHalf(Obj)`
- `IsPillPart(Obj)`

Do not scatter raw array indexing everywhere. Because Verse indexing is failable, centralize this:

- `GetInGrid(Grid, Cell) : ?grid_object`
- `SetInGrid(Grid, Cell, Obj) : [][]grid_object`
- `RemoveCell(Grid, Cell) : [][]grid_object`

## Game Shape

There are two plausible Verse shapes:

### Option A: `game_state` + pure-ish functions

```text
Tick(State, Actions) -> tuple(game_state, ?game_tick_result)
MovePill(Grid, Pill, Direction) -> move_pill_result
DestroyLines(Grid) -> destroy_lines_result
```

Pros:

- closer to Verse immutability
- easier deterministic testing
- snapshots/rollback stay natural
- renderer can keep previous/current states

Cons:

- call sites are more verbose
- more explicit state threading

### Option B: `game` class with mutable fields

```text
game := class:
    var State : game_state
    Tick(Actions) : ?game_tick_result = ...
```

Pros:

- closer to current TypeScript `Game`
- easier for a UEFN device to own

Cons:

- more mutation paths
- rollback/snapshot semantics easier to muddle

Recommendation:

- implement the simulation as pure-ish functions over `game_state`
- wrap it in a small `game_runner` or device class only at the edge

In other words: Verse classes for ownership/lifecycle, structs/functions for simulation.

## Utilities To Port

Port these first, in roughly this order:

1. constants
   - width/height
   - colors
   - gravity table
   - virus count table
   - min virus row table

2. grid/generators
   - constructors
   - empty grid
   - seeded random/shuffle equivalent
   - enemy generation

3. guards
   - cell predicates
   - move/action predicates

4. setters
   - set/remove cell
   - destroy cells
   - set pill segment widows

5. movement
   - `givePill`
   - `moveCell`
   - `moveCells`
   - `movePill`
   - `slamPill`
   - `rotatePill`

6. line/cascade
   - `findLines`
   - `destroyLines`
   - `removeDestroyed`
   - `dropDebris`
   - `clearTopRow`
   - `giveGarbage`

7. `Game.Tick`
   - ready
   - playing
   - reconcile
   - destruction
   - cascade
   - ended

8. `MultiGame`
   - N game states
   - lockstep tick
   - per-player actions
   - combo garbage on next tick
   - win/lose/draw arbitration

## Determinism

The TypeScript version depends on seeded RNG for:

- virus generation
- next pill generation
- garbage column placement

The Verse port needs an explicit deterministic RNG strategy.

Options:

- port the current seeded random/shuffle behavior exactly
- replace it with a simpler deterministic RNG, but accept different boards/pill streams
- precompute seeds/pill sequences outside Verse for early testing

Recommendation:

- early UEFN prototype can use a simpler deterministic RNG
- later cross-port parity needs a real RNG spec and fixture tests

## Testing Strategy

Do not wait for UEFN visual testing.

Create small parity fixtures in this repo:

- initial grid text
- action list by frame
- expected final grid
- expected result

Then use those fixtures for:

- TypeScript tests now
- Verse manual/unit-ish tests later

Good first fixtures:

- move pill left/right/down
- rotate horizontal to vertical
- rotate vertical to horizontal with kick
- slam
- simple horizontal line
- simple vertical line
- virus clear win
- garbage lands on reconcile
- combo produces garbage colors

## Renderer Boundary

UEFN renderer should not know game rules.

Renderer owns:

- mesh pool
- material/color mapping
- board origin/scale
- grid-to-world transform
- animation timing
- player camera / view placement

Simulation exposes:

- current `game_state`
- changed cells if we want optimization later
- tick result

First renderer can be naive:

- clear/rebuild all visible grid meshes every render tick

Later renderer:

- diff previous/current grid
- reuse spawned props/creative objects
- animate falling/destruction separately from sim state

## Input Boundary

UEFN input should translate to `game_action`.

The simulation should not know whether input came from:

- keyboard
- controller
- button device
- trigger volume
- Fortnite player interaction
- AI/bot

Expected action shape:

- player index
- frame
- action kind
- input kind
- event type

For early prototype, skip key repeat and emit discrete tap actions. Add repeat/hold semantics later if Fortnite input devices make that sane.

## Multiplayer Shape

`MultiGame` should probably be ported, but not before single-board `Game` is solid.

UEFN multiplayer target:

- one authoritative Verse device owns `multi_game_state`
- each Fortnite player is assigned a board index
- player input queues actions for that board
- device ticks all boards in lockstep
- combo garbage queues for other players on next tick
- match result ends the device-owned session

This maps well to the current TypeScript `MultiGame`.

Open questions:

- how many players is practical in one Fortnite island UI?
- should all boards be visible to all players?
- are players physically standing at their own board, or is there a shared spectator layout?
- do we need remote latency handling, or does Verse authority make local island play simple enough?

## What Not To Port Yet

Skip for the first UEFN pass:

- web-client UI
- socket client/server
- high scores
- rollback
- bot
- shimmer/art code
- React controller patterns
- old `GameController`

Maybe later:

- `MultiGameRunner` ideas
- action history
- snapshot/replay
- high-score validation

## First Implementation Plan

Tiny step sequence:

1. create `core-verse/` as a WSL-side staging folder
2. create a Verse module with enums, constants, `grid_cell_location`, and `grid_object`
3. scaffold stub devices immediately so we can sprint toward a playable UEFN demo
4. start with `MultiGame` shape from day one, even while single-board rules are incomplete
5. implement empty grid and get/set helpers
6. implement `give_pill` and render a static spawned pill in a test device
7. implement left/right/down movement
8. implement rotation
9. implement slam
10. implement line detection/destruction
11. implement cascade
12. connect input
13. connect renderer

Each step should be visible and testable in isolation.

Current staging folder:

- `core-verse/`

Naming convention:

- Verse files use snake_case
- Verse classes use snake_case
- Verse variables/fields use PascalCase, matching local Verse convention

Main device:

- `mrdario_match_device`

Supporting devices:

- `mrdario_board_device`
- `mrdario_test_device`

Clock model:

- keep integer simulation frames inside the game state
- drive them from wall-clock elapsed time in the device
- use `Sleep(0.0)` for the next simulation update
- use `GetSimulationElapsedTime()` to accumulate elapsed time
- step `floor(accumulator / (1 / 60))` sim ticks, capped by `max_catchup_ticks`
- render after one or more sim ticks

This avoids assuming render-frame control in UEFN.

## Design Bias

Prefer clarity over clever parity at first.

The TypeScript code is a proven source of truth, but Verse may want different local idioms. Keep the same behavior and public concepts; do not force the same class boundaries if Verse fights them.

Likely final shape:

- `game_types.verse`
- `grid_utils.verse`
- `move_utils.verse`
- `line_utils.verse`
- `game_sim.verse`
- `multi_game_sim.verse`
- `mrdario_board_device.verse`
- `mrdario_match_device.verse`

The most important invariant:

- renderer observes state
- input produces actions
- simulation owns rules

## Current Verse Status

Implemented in `core-verse/src`:

- pure-ish single-board `game_state` tick loop
- grid constructors, get/set/remove helpers, movement, slam, rotation, destruction, cascade
- virus generation, pill generation, garbage placement with deterministic Verse-side RNG
- exact gravity table from the TypeScript constants
- input hold/repeat counters in `game_state`
- `multi_game_state` with deferred combo garbage queues
- match device clock and per-player pending action queues
- board device render-intent diffing for vertical visible board cells

Known caveat:

- RNG is deterministic but not `seedrandom.alea` compatible yet, so same seed does not guarantee same board/pill stream as the TypeScript implementation.

## UEFN Board Rendering Plan

Current renderer shape:

- board is vertical
- row 0 remains hidden and is not rendered
- rows 1..16 and cols 0..7 produce 128 visible render cells
- `mrdario_board_device` diffs each cell against its previous `cell_visual_kind`
- current test backend spawns scaled `creative_prop_asset` placeholders for changed occupied cells and disposes them on empty/change
- visual kinds are:
  - `PillColor1`
  - `PillColor2`
  - `PillColor3`
  - `VirusColor1`
  - `VirusColor2`
  - `VirusColor3`
  - `Destroyed`
  - `Empty`

Renderer target:

- use separate mesh assets for the six core visible states:
  - pill color 1/2/3
  - virus color 1/2/3
- optionally add a seventh destroyed/fx mesh, or handle destruction with material/vfx
- no gameplay collision needed
- no preplaced 128-prop grid as the final architecture

Why not `creative_prop` as the main path:

- `SpawnProp` spawns `creative_prop` instances from `creative_prop_asset`, not raw mesh visuals
- spawned prop limits are a bad fit for one or more 8x16 boards
- props bring collision/creative-object behavior we do not need for simple board cells

Preferred path:

- use Scene Graph mesh entities/components for visual-only cells
- keep one spawned entity per occupied cell, not one permanent object per board slot
- create/update/dispose only when a cell's `cell_visual_kind` changes
- use mesh components with collision/query disabled where possible

Testing fallback:

- before custom mesh assets exist, use Fortnite library `creative_prop_asset` placeholders
- configure six editable assets on `mrdario_board_device`:
  - `PillColor1Asset`
  - `PillColor2Asset`
  - `PillColor3Asset`
  - `VirusColor1Asset`
  - `VirusColor2Asset`
  - `VirusColor3Asset`
- tune `BoardOrigin`, `CellSize`, and `CellScale` to make the vertical bottle readable
- use per-asset scale editables to normalize wildly different placeholder prop sizes while keeping `CellScale` as the global board scale
- this is for smoke testing only; `SpawnProp` limits mean it is probably not the final renderer for dense boards or multiple players

Implementation boundary:

- `mrdario_board_device` should stay a thin observer of sim state
- actual Scene Graph mechanics should live behind methods like:
  - `SpawnVisual(Row, Col, VisualKind)`
  - `UpdateVisual(Row, Col, VisualKind)`
  - `DisposeVisual(Row, Col)`
- generated mesh component names will likely come from `Assets.digest.verse`, so the exact code should be written in the UEFN project after the meshes exist

Next asset questions:

- what are the generated Verse names for the six mesh components/assets?
- do pill mesh visuals need left/right/top/bottom orientation now, or can a color-only pill mesh carry v1?
- should destroyed cells pop, flash, or briefly swap to a destroyed mesh before disappearing?
