# Project Status

This repo is being revived carefully. The immediate goal is to modernize the stack in small, low-risk steps before doing serious multiplayer architecture work.

## Current State

- The project is a Dr. Mario clone with a strong separation between game simulation and rendering.
- The most durable asset in the codebase is the core game simulation in `core/src/game/Game.ts`.
- Core tests are green.
- The repo expects Node 14 via `.nvmrc`.

## Recent Changes

- `core` has been migrated from TSLint to ESLint.
- `core` lint passes with a conservative ESLint config.
- Explicit type annotations are intentionally preserved in `core`; `@typescript-eslint/no-inferrable-types` is disabled.
- Narrow ESLint exceptions in `core` are intentional, not accidental cleanup debt.

## Known Repo Constraints

- This is a Yarn workspaces repo. Validation should be done with workspace-aware commands.
- Root dependency installs can still fail because some other workspaces are on very old tooling.
- In particular, old `node-sass` / Python 2 era baggage still exists outside `core`.
- Other workspaces still use TSLint.

## Near-Term Direction

1. Continue modernizing `core` first.
2. Keep `core` package shape stable while upgrading TypeScript/Jest/tooling.
3. Delay major multiplayer implementation work until the stack is less fossilized.
4. Modernize server/client after `core` is in a healthier place.

## Working Style

- Be conservative about changes.
- Prefer small vertical slices over broad rewrites.
- Talk before major architectural changes.
- Treat `core/game` as the sacred object and surrounding infrastructure as replaceable.
