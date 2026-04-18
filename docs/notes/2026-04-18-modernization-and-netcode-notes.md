# 2026-04 Modernization And Netcode Notes

These notes are intentionally rough. They exist to preserve context and avoid having to re-derive the same conclusions later.

## Why Modernize First

Trying to finish rollback multiplayer on top of the current stack is possible, but high-friction.

Reasons:

- The stack is old across `core`, `server`, and `web-client`.
- Multiple multiplayer/controller experiments exist, but none became the single canonical path.
- Tooling drift is already causing avoidable friction during ordinary maintenance.

Current strategy:

- Modernize `core` first.
- Keep behavior stable.
- Avoid mixing stack modernization with multiplayer architecture invention.

## Core Tooling Status

Completed:

- `core` moved from TSLint to ESLint.
- `yarn workspace mrdario-core lint` passes.
- `yarn workspace mrdario-core test` passed during migration work.
- `core` TypeScript was upgraded from `3.9` to `4.9`.
- `core` Jest stack was upgraded to Jest 29 / ts-jest 29.
- `yarn workspace mrdario-core build` now passes under Node 14.

Important decisions made:

- Preserve explicit types where they help readability.
- Do not let lint autofixes erase type annotations just because inference exists.
- Use narrow lint exceptions rather than broad ideological cleanup.
- Validate repo-affecting work under `.nvmrc` Node 14 semantics.

Open caveat:

- Root workspace install still has legacy breakage outside `core`, especially around old Sass/native tooling.
- Root workspace install may still require `--ignore-engines` while unrelated workspaces remain stale.
- `core` now uses `skipLibCheck: true` as a pragmatic compatibility compromise with older third-party typings.

Current `core` toolchain landing spot:

- `typescript`: `4.9.5`
- `jest`: `29.7.0`
- `ts-jest`: `29.2.6`
- `@types/jest`: `29.5.14`
- `eslint`: `8.57.1`

## Recent `core` dependency cleanup

Completed after the initial tooling migration:

- Replaced `ts-invariant` usage with local `assert` and removed the dependency.
- Upgraded `fp-ts` to `2.16.11`.
- Upgraded `io-ts` to `2.2.22`.
- Upgraded `immer` to `10.1.1`.
- Removed stale `@types/invariant`.
- Upgraded `lodash` to `4.17.21`.
- Upgraded `@types/lodash` to `4.17.20`.
- Upgraded `mousetrap` to `1.6.5`.
- Upgraded `events` to `3.3.0`.
- Upgraded `@ircam/sync` to `2.1.0`.

Validation status for the above:

- `yarn workspace mrdario-core build` passes under Node 14.
- `yarn workspace mrdario-core lint` passes under Node 14.
- `yarn workspace mrdario-core test` passes under Node 14.

Known lingering caveat:

- Jest still emits the old worker/timer leak warning during `core` tests. This appears pre-existing and was not introduced by the dependency updates.

Stale dependency review snapshot:

- `socketcluster*` is still intentionally deferred. Too invasive for casual bumping.
- `typestate`, `hammerjs`, and `driftless` are still old enough that replacement may be cleaner than upgrading.
- `mousetrap`, `events`, and `@ircam/sync` now look acceptable for the current modernization phase.

## Multiplayer / Architecture Findings

### Durable asset

`core/src/game/Game.ts` is the strongest long-term asset:

- simulation is separate from rendering
- state can be captured/restored
- multiplayer-relevant inputs/outputs already exist conceptually

### Relevant prototypes

`GameController2` is the most relevant multiplayer/rollback prototype.

Why:

- multiple games
- action history
- future action queues
- explicit rewrite/replay intent for late actions

But:

- it appears unfinished
- there are likely correctness issues in history rewrite / replay details

### Less relevant / incomplete branches

- `MultiGame` is basically a stub
- `controller/3` contains transport/reliability experimentation and controller restarts, but is less complete than `GameController2`
- old single-game mirror/server-authoritative experiments are useful precedent, but probably not the long-term architecture for proper multiplayer

### Practical reading of repo history

This is not "multiplayer was never started".

It is closer to:

- the right simulation boundary was created
- multiple controller/network paths were explored
- the work bifurcated before a single architecture won

## Current Best Guess For Upgrade Order

1. Keep `core` stable and modernize its tooling.
2. Upgrade `core` TypeScript/Jest stack while keeping emitted package shape stable.
3. Modernize `server` as thin orchestration/routing infrastructure.
4. Modernize `web-client` shell/build path.
5. Trim dead experiments only after replacements exist.
6. Revisit multiplayer architecture once the stack is healthier.

## Things To Remember Later

- Use Node 14 semantics while the repo still depends on `.nvmrc`.
- This is a Yarn workspaces repo; root-vs-workspace behavior matters.
- `core` first is a deliberate strategy, not procrastination.
- Do not casually rewrite `Game` during tooling work.
- Do not collapse multiple unfinished multiplayer experiments into one big confused refactor.

## 2026-04-18 Web Client Checkpoint

Completed:

- Replaced `web-client` `node-sass` with `sass`.
- Converted the small Sass surface from `@import` to `@use`.
- Extracted shared Sass placeholder state into `web-client/src/styles/_shared.scss`.
- Moved `web-client` from TSLint to ESLint.
- Removed `awesome-typescript-loader`.
- Removed `babel-loader` from the TypeScript / JSX path.
- Switched webpack alias resolution to `tsconfig-paths-webpack-plugin`.
- Switched TS / TSX compilation to `ts-loader` with `transpileOnly: true`.
- Changed `web-client/tsconfig.json` JSX mode from `preserve` to `react`.

Validation status:

- `yarn workspace mrdario-client-web lint` passes under Node 14.
- `yarn workspace mrdario-client-web build` passes under Node 14.

Important findings:

- `web-client` no longer depends on old native Sass tooling to install/build.
- `web-client` does not appear to need Babel for the current TS / JSX path.
- Plain `ts-loader` typechecking pulled in `core` and failed against newer dependency typings plus older `web-client` TypeScript.
- `transpileOnly: true` keeps the migration scoped and restores the old practical behavior.

Next likely move:

- Upgrade `web-client` TypeScript from `3.9.8` to a more modern version.
- Revalidate build / lint after the TS bump.
- Only then decide whether webpack 4 should be upgraded in place or replaced later.

## 2026-04-18 Web Client Webpack 5 / Node 18 Checkpoint

Completed:

- Upgraded `web-client` from webpack 4 to webpack 5.
- Upgraded related webpack stack packages (`webpack-cli`, `webpack-dev-server`, `webpack-merge`, `html-webpack-plugin`, `css-loader`, `style-loader`, `less-loader`, `sass-loader`, `source-map-loader`, `ts-loader`).
- Removed `uglifyjs-webpack-plugin`.
- Removed `react-hot-loader`.
- Removed `raw-loader` usage and replaced the old inline-loader path with webpack 5-native handling.
- Added browser fallbacks needed by older client deps (`path-browserify`, `url`).
- Fixed the OpenSSL / `ERR_OSSL_EVP_UNSUPPORTED` problem on Node 18 by getting off webpack 4 instead of relying on the legacy-provider workaround.

Follow-on runtime fixes needed after the webpack 5 upgrade:

- Restored the root layout height chain:
  - `html`, `body`, and `#container` now explicitly get `width: 100%` and `height: 100%`
  - removed a pointless wrapper `<div>` around `AppContainer`
- Fixed CSS module runtime shape for `.module.scss` by aligning loader interop away from broken empty-class exports.
- Fixed mirror layout/container positioning so the two playfields occupy separate halves again.
- Simplified responsive game measurement:
  - removed `react-container-dimensions`
  - avoided `ResizeObserver` loop issues
  - current behavior uses mount + window-resize measurement with viewport fallback

Current validation status:

- `yarn workspace mrdario-client-web build` passes under Node 18.
- `yarn workspace mrdario-client-web lint` passes under Node 18.
- `web-client` is back to a working state comparable to where it was before the upgrade blob.

Important caveats / known provisional fixes:

- The preview pill rendering is currently working through a pragmatic fallback rather than the old inline-SVG path.
- `PillPreviewPanel` now uses ordinary image assets with explicit left/right rotation instead of the previous nested SVG / raw markup approach.
- This works for now, but should be revisited later as part of a broader cleanup of asset/module interop.
- `PillPart` / `makeReactSvg` and related preview-asset plumbing likely need a cleaner long-term story.
- Some of the webpack 5 migration fixes were runtime compatibility repairs rather than elegant architectural improvements.

What to revisit later:

- Decide on one clean strategy for rendering preview pill halves:
  - proper inline SVG/component path
  - or keep image-asset rendering intentionally
- Revisit the old raw SVG helper path only if there is a clear benefit.
- Simplify responsive sizing further now that the root height contract is repaired.
- Audit remaining webpack 5 loader/config compatibility choices with less time pressure.

## 2026-04-18 Router / Lifecycle / TSConfig Cleanup

Completed:

- Upgraded `web-client` routing from `react-router-dom` 4 to 5.
- Moved several legacy class lifecycles off deprecated APIs:
  - `HighScores` now uses `componentDidMount`
  - `MirrorGame2` now uses `componentDidMount` / `componentDidUpdate`
  - `Playfield` now uses `componentDidUpdate`
  - `SVGShimmerCycler` and `SVGShimmerFills` now use `componentDidUpdate`
- Fixed `Playfield` update behavior so pixi grid changes are still allowed through `shouldComponentUpdate`.
- Fixed destroyed-cell rendering in `Playfield` / `Playfield2`; particles came back with it.
- Removed dead `Playfield2` after confirming it was unused.

Important findings:

- Most of the scary old React lifecycle usage was not conceptually hard to migrate; it was mostly mount-time init or prop-change side effects.
- `Playfield` was the one nontrivial case because its imperative pixi diff path depended on update-gating behavior.
- Router warnings were mostly dependency-age warnings, not evidence that the app needed a framework rewrite.

Asset / module interop landing spot:

- `web-client` TypeScript module output is now `esnext`.
- This was necessary to make webpack 5 asset-module behavior and default asset imports behave sanely.
- The clean default-import path for SVG / PNG assets is now working again.
- `SingleRemoteGame` was corrected to import `PuppetGameController` from `mrdario-core/lib/...` instead of reaching into `mrdario-core/src/...`.

TSConfig cleanup completed:

- Removed the temporary `ignoreDeprecations` workaround.
- Root shared TypeScript target moved from `es5` to `es2015`.
- `web-client` TypeScript target moved from `es5` to `es2015`.
- Removed deprecated `baseUrl` usage from `web-client/tsconfig.paths.json`.
- Replaced it with explicit `paths` entries (`"./src/*"`).
- Added explicit `rootDir` in `core` and `web-client`.

Validation status:

- `yarn workspace mrdario-core build` passes.

## 2026-04-18 Node 20 / TS 6 Follow-Up

Completed:

- Repo baseline moved to Node `20` via `.nvmrc`.
- Root `package.json` now declares `packageManager: "yarn@1.22.22"`.
- `web-client` is now on TypeScript `6.0.3`.
- `core` is now on TypeScript `6.0.3`.

Important fixes needed to make TS 6 sane in `web-client`:

- Use the actual workspace TypeScript binary; root `./node_modules/.bin/tsc` was still `4.9.5` and gave misleading diagnostics.
- Keep `moduleResolution: "bundler"` with `module: "esnext"` in `web-client`.
- Exclude `*.test.ts(x)` from the main app tsconfig.
- Add `typeRoots: ["./node_modules/@types"]`.
- Force the repo onto one React type universe via root `resolutions` for `@types/react` and `@types/react-dom`.
- Remove redundant `@types/react-redux` from `web-client` because `react-redux@7` already ships its own types.
- Add `children?: React.ReactNode` to `AppContainer` props.
- Accept `skipLibCheck: true` in `web-client` as the pragmatic answer to stale third-party type sludge (`pixi-particles`, `rc-tooltip`).

Important fix needed to make TS 6 sane in `core`:

- Move `types: ["jest"]` into `compilerOptions` in `core/tsconfig.json`; the old top-level placement was being ignored by TS 6 and broke test globals during `tsc`.

Node 20 validation sweep:

- `yarn workspace mrdario-core build` passes.
- `yarn workspace mrdario-server build` passes.
- `yarn workspace mrdario-integration build` passes.
- `yarn workspace mrdario-node-cli build` passes.
- `yarn workspace mrdario-bots build` passes.
- `yarn workspace mrdario-client-web build` passes.
- `yarn workspace mrdario-client-web lint` passes.
- `yarn workspace mrdario-client-web test --runInBand` passes.

Remaining caveat:

- `core` tests still have the old async/timer leak behavior in `ClientGameController3` land and spam `Cannot log after tests are done` from `console.log("tick")`.
- This still looks pre-existing. It does not appear to be a Node 20 or TS 6 regression, but it makes `core` test output grotesque and potentially non-terminating enough to be worth cleaning up separately.

## 2026-04-18 npm Workspaces Migration

Completed:

- Replaced root Yarn metadata with npm metadata:
  - `packageManager` is now `npm@10.8.2`
  - root `resolutions` became npm `overrides`
- Generated a root `package-lock.json`.
- Removed `yarn.lock`.
- Updated package scripts in `core` and `web-client` to use `npm run ...` instead of `yarn run ...`.
- Updated `README.md` and `docs/status.md` to stop telling lies about Yarn.

Validation status under Node 20 with npm workspace commands:

- `npm run build -w mrdario-core` passes.
- `npm test -w mrdario-core -- --runInBand` passes.
- `npm run build -w mrdario-client-web` passes.
- `npm test -w mrdario-client-web -- --runInBand` passes.
- `npm run build -w mrdario-server` passes.

Important outcome:

- The repo no longer appears to need Yarn for anything essential.
- npm workspace commands are now the canonical way to build/test/install.
- `yarn workspace mrdario-client-web lint` passes.
- `yarn workspace mrdario-client-web build` passes.

Notes for later:

- If more asset-import weirdness appears, prefer fixing config/module alignment over piling on import-shape hacks.
- `web-client` is now in a much healthier place for a later move off Yarn classic / Node 14 assumptions.
