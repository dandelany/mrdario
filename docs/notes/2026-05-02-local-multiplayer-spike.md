# 2026-05-02 Local Multiplayer Spike

These notes capture the current multiplayer spike so the next pass does not have to re-derive the architecture.

## Goal

Near-term milestone:

- playable local multiplayer in the browser
- two players on one keyboard
- no server dependency
- no high scores
- no rollback yet, but do not paint rollback into a corner

This now works at:

- `/dev`
- `/dev/local-multi/level/0/speed/15`

Controls:

- player 1: arrows, `z` / `x`
- player 2: `w` / `a` / `s` / `d`, `q` / `e`

## Current Shape

`Game` remains the single-board deterministic simulation.

`MultiGame` now wraps N `Game` instances and owns multiplayer game rules:

- creates one `Game` per player
- ticks all games in lockstep
- accepts per-player action arrays
- queues combo garbage for all other players on the next tick
- resolves win / lose / draw
- stores terminal result after the match ends
- stops mutating after terminal result

`MultiGameRunner` is now the local clock/action shell around one `MultiGame`:

- setup / ready / playing / paused / ended modes
- frame-stamped per-player action queue
- future external action log retained for later replay/rollback
- calls `multiGame.tick(actionsByPlayer)`
- exposes state for UI

The important architecture correction:

- old `MultiGameRunner` was "many `GameRunner`s"
- current `MultiGameRunner` is "one runner around one `MultiGame`"
- this avoids duplicating win/loss/garbage policy outside `MultiGame`

## New Web Client Dev Surface

Added a dev page:

- `web-client/src/components/pages/DevPage.tsx`
- route: `/dev`
- title page links to it

Added a local multiplayer page:

- `web-client/src/components/pages/LocalMultiGame.tsx`
- route: `/dev/local-multi/level/:level/speed/:speed`
- owns a `MultiGameRunner`
- ticks with `setInterval(..., 1000 / 60)`
- binds two `KeyManager`s
- renders two `ResponsiveGameDisplay`s

Core package export added:

- `mrdario-core/game/runner`
- `mrdario-core/game/runner/*`

This keeps web-client imports on the package boundary instead of deep-importing internals.

## Combo / Garbage Notes

Combo garbage works.

Tests now cover:

- `MultiGame` queues garbage after combo
- queued garbage is drained once
- garbage action lands as visible pill segments during reconcile
- `MultiGameRunner` carries combo-derived garbage through the next tick

Important UX caveat:

- pending garbage is stored on `gameState.garbage`
- it is not visible on the playfield until the target board reaches reconcile
- this can look like "garbage did not work" during play

Likely future UI improvement:

- render incoming garbage beside each board
- do not wait for it to visibly land on the grid before showing player feedback

Temporary dev breadcrumb:

- `LocalMultiGame` logs non-empty tick results as `[local-multi] tick result`
- useful for checking whether combos are actually being emitted

## Terminal Result Semantics

Current behavior:

- `MultiGame.result` is authoritative for match outcome
- child `Game` instances are not forcibly sent `Defeat` / `ForfeitWin`
- once `MultiGame` has a result, further ticks no-op

This is acceptable for the local multiplayer spike.

Open design question:

- should the match record eventually finalize child games with `Defeat` / `ForfeitWin` on frame `n + 1`?

Probably yes for a cleaner historical record, but do it deliberately when rollback/history is formalized. Avoid double-ticking child games just to make their modes prettier.

## Rollback / History Constraints

Do not lose these constraints:

- external actions should remain frame-stamped
- `MultiGameState` should be snapshot-friendly
- future rollback should replay one `MultiGame`, not N unrelated child runners
- derived garbage is internal `MultiGame` behavior, not a network/client-authored action
- late actions are currently rejected in `MultiGameRunner` until rollback exists

Likely rollback path:

- store external action history per player
- store periodic `MultiGameState` snapshots
- on late action, restore the snapshot before that frame
- replay external actions through `MultiGame`
- recompute derived garbage/results naturally

## Tests Added

Core:

- `core/src/game/MultiGame.test.ts`
- `core/src/game/runner/MultiGameRunner.test.ts`

Coverage includes:

- lockstep ticking
- combo garbage
- visible garbage landing
- win / lose / draw arbitration
- win supersedes same-frame loss
- ended multigame no-op behavior
- runner setup/start/pause/resume/ended lifecycle
- per-player queued actions
- late action rejection

Validation commands used:

- `npm run test -w mrdario-core -- MultiGame.test.ts MultiGameRunner.test.ts --runInBand`
- `npm run build -w mrdario-core`
- `npm run build -w mrdario-client-web`

Plain web-client `tsc --noEmit` still fails on pre-existing repo-wide issues:

- ambient `require`
- `socketcluster-client` declarations
- `rc-slider` handler types
- a few older implicit-any edges

Webpack build is still the meaningful current web-client validation path.

## Next Good Steps

Immediate polish:

- replace single-player win/loss overlays on local multiplayer with match-level overlays
- show incoming garbage queue in the UI
- maybe add pause/resume/reset keyboard controls for local multiplayer

Architecture soon:

- define `MultiGameRunner` snapshot/history shape
- decide how to represent final child-game records
- decide whether `GameActionType.Defeat` / `ForfeitWin` stay first-class in the new path

Later:

- remote multiplayer should reuse `MultiGame` semantics
- server should validate or authoritatively run the same frame/action stream
- uncheatable high scores can share some runner/history infrastructure, but do not require `MultiGame`

## Operational Note

Do not start persistent dev servers unless explicitly asked.

The user will run the web server when ready.
