# Project Status

This repo is being revived carefully. The immediate goal is to modernize the stack in small, low-risk steps before doing serious multiplayer architecture work.

## Current State

- The project is a Dr. Mario clone with a strong separation between game simulation and rendering.
- The most durable asset in the codebase is the core game simulation in `core/src/game/Game.ts`.
- Core tests are green.
- The repo now targets Node 20 via `.nvmrc`.
- The repo now uses npm workspaces with a root `package-lock.json`.

## Recent Changes

- `core` has been migrated from TSLint to ESLint.
- `core` lint passes with a conservative ESLint config.
- Explicit type annotations are intentionally preserved in `core`; `@typescript-eslint/no-inferrable-types` is disabled.
- Narrow ESLint exceptions in `core` are intentional, not accidental cleanup debt.

## Known Repo Constraints

- This is now an npm workspaces repo. Validation should be done with workspace-aware npm commands.
- Root dependency installs should go through `npm install` at repo root.
- Root overrides are used for shared dependency alignment (for example React type packages).
- The remaining higher-risk runtime/tooling area is the old socketcluster-era server stack.
- Some non-core workspaces still have older lint/test tooling that has not been fully modernized yet.

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
