# Demo vs Real Game Delta

Track the deliberate shortcuts in the UEFN port.

## Minimal Demo Target

- one `mrdario_match_device`
- two boards from day one, even if only one player is wired
- fixed player count
- simple seeded RNG, not TypeScript-compatible RNG
- wall-clock driven sim loop with integer sim ticks
- naive board redraw
- no rollback
- no high scores
- no polished mesh animation

## Real Game Target

- N-player `multi_game_state`
- deterministic seed per match
- player join/leave assignment
- clean input queue per player
- renderer diffing or pooling
- explicit match reset lifecycle
- possible action history / rollback if Verse networking/input timing demands it
- parity fixtures shared with TypeScript where practical

## Known Hard Parts

- Verse compiler feedback will happen outside this WSL repo
- exact failable-indexing ergonomics may reshape grid helpers
- input events may not map cleanly to held key semantics
- sim loop must avoid runaway catch-up after hitches
- renderer timing and sim timing should stay separate
