# core-verse

Blind Verse port workspace for Mr. Dario core gameplay.

This folder is meant to be copied into a UEFN project for real compiler/runtime testing. Keep `src/` as copyable as possible.

## Shape

- `game_types.verse`: enums, structs, constants
- `grid_utils.verse`: grid constructors/access helpers
- `game_sim.verse`: single-board simulation
- `multi_game_sim.verse`: N-board multiplayer wrapper
- `mrdario_match_device.verse`: main playable device / clock owner
- `mrdario_board_device.verse`: one board renderer stub
- `mrdario_test_device.verse`: fixture/smoke test runner stub

## Current Bias

- classes/devices own lifecycle
- structs/functions own simulation data
- `mrdario_match_device` is the main device
- `mrdario_board_device` renders one board
- `mrdario_test_device` exists early because UEFN test ergonomics are unknown

## Copy Workflow

This repo lives in WSL. UEFN lives on Windows.

For now, copy `core-verse/src/*.verse` into the UEFN project's Verse source folder, compile there, then bring error notes back here.

Do not assume files in this folder compile until UEFN says so.
