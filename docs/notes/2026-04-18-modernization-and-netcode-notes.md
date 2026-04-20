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

## 2026-04-19 ESM / Transport / Single-Player Checkpoint

This is the current practical landing spot after the more recent migration pass. The repo is in much better shape than the earlier Node 14 / Yarn-era baseline, but it is still not "finished". The important thing is that the remaining rough edges are much more localized and understandable.

### Overall repo state

Completed:

- Root workflow is now Node 20 + npm workspaces rather than the old Yarn / Node 14 assumptions.
- `core` is ESM-first with explicit package exports.
- `server` is running on SocketCluster 20 without the old protocol downgrade shim.
- `web-client` and `terminal-client` are also on `socketcluster-client` 20.
- `integration` tests are back to running against built JS rather than the older ts-jest / mixed-module swamp.

Important framing:

- The repo is no longer dominated by build-tool necromancy.
- Most remaining issues are now either:
  - real architecture debt
  - real package/dependency debt
  - or a small number of lifecycle/runtime bugs

### Server architecture state

Completed:

- Removed the old `AbstractServerModule` inheritance model.
- Converted the active game server modules to the newer runtime/module-definition style:
  - `auth`
  - `scores`
  - `lobby`
  - `match`
  - `game`
  - `sync`
- Replaced the fake old SocketCluster compatibility layer with a direct SocketCluster transport adapter:
  - `server/gameserver/runtime/socketcluster.ts`
- `server` now builds and runs as native ESM.

Why this matters:

- The module boundary now better reflects the original intent:
  - pluggable modules
  - centralized registration
  - transport concerns pushed below the module layer
- The architecture is now plausibly adaptable to another transport later (e.g. Socket.IO) without preserving the old fake-SocketCluster surface forever.

What still needs work:

- `server/gameserver/runtime/socketcluster.ts` is still too big and still mixes multiple concerns:
  - connection wrapping
  - lifecycle listeners
  - request/event binding
  - topic middleware
  - error normalization
- Runtime concepts are still a bit mushy:
  - procedure vs event vs lifecycle registration should become more explicit over time
- Some server-side types are still transitional / pragmatic rather than cleanly modeled.

### Single-player / merge-checkpoint status

Completed:

- Restored the normal local single-player flow as the default user path instead of the mirror experiment.
- `SinglePlayerGame` is back to acting like the old local game:
  - local gameplay in browser
  - high score submission on win
- The "play online" button on the title page is now visibly disabled rather than routing into incomplete multiplayer flow.
- High score submission bug around stale pre-time-bonus score was fixed.

Important product decision:

- The current merge target should be:
  - stable single-player
  - high scores working
  - mirror experiment not being the default path
- Server-authoritative anti-cheat single-player should be treated as follow-on work, not the merge gate.

### Playfield / asset pipeline findings

Important result:

- The giant blown-up background-sprite glitch was traced to the modern asset-loading path rather than random PIXI insanity in general.
- Game sprite SVGs are now imported through `?inline`, which avoids one-request-per-sprite behavior and reduces the bad async timing surface.

Important caution:

- There was a failed attempt to "fix" remount issues by changing PIXI teardown / gating behavior in `Playfield`.
- That change path was reverted.
- The lesson is that lifecycle and rendering issues in the game view should be treated carefully; not every visual bug is a texture-race bug.

### Integration / test harness state

Current status:

- `integration` now behaves as a built-JS Jest harness rather than a ts-jest ESM labyrinth.
- `integration` test scripts were cleaned up to use `jest` through npm script PATH with `NODE_OPTIONS=--experimental-vm-modules`.
- The old fake `start` entry was removed in spirit by making `start` just run tests; `integration` is not a runtime app.
- The open-handle noise was improved:
  - detached server setup now closes parent log file descriptors
  - Redis cleanup is handled in `setupFilesAfterEnv` and `globalTeardown`

Known caveat:

- The current `integration` setup works, but it is still not elegant.
- The user preference is to eventually move toward writing TS tests and running them as natively as possible, rather than maintaining a brittle ts-jest / Jest-module shim stack.
- That preference should guide future test-runner work.

### Jest / lint / tooling state

Completed:

- `core` and `web-client` were moved to ESLint 9 flat config.
- The TypeScript-aware lint rules are now configured correctly enough that:
  - base JS rules do not falsely flag TS constructs
  - TypeScript-specific unused-vars can still surface as warnings

Important lesson:

- The correct TypeScript lint model is:
  - disable base `no-unused-vars` / `no-redeclare` / `no-undef` on TS files
  - use the `@typescript-eslint` extension rules where appropriate
- Earlier false positives around exported enums, type parameters, ambient declarations, etc. came from base ESLint rules touching TS syntax.

Current compromise:

- `@typescript-eslint/no-unused-vars` is set to `warn` rather than `error`.
- This avoids destructive cleanup pressure in old experimental code while still surfacing likely dead imports / vars.

Jest status:

- The repo is now on Jest 30 package versions.
- However, the remaining npm deprecation warnings are largely upstream:
  - `ts-jest` still pulls `test-exclude -> glob@7 -> inflight`
  - current Jest 30 internals still pull `glob@10.5.0`, which is itself deprecated

Practical conclusion:

- A truly clean npm install with zero remaining deprecation warnings is not achievable while keeping both:
  - current Jest 30 internals
  - `ts-jest`
- The next real cleanup there is not another patchwork version bump; it is likely a migration away from `ts-jest`.

### Terminal client state

Completed:

- `terminal-client` was modernized to ESM and SocketCluster 20.
- It now builds and runs again as a proper CLI client.

Notes:

- This is useful as a proof that the repo's core gameplay path still works outside the browser.
- It is also a nice canary for whether client-side protocol / API changes are actually coherent.

### Current dependency-cleanup picture

Completed recently:

- Upgraded active SVG optimization stack toward modern `svgo`.
- Replaced direct old `rc-slider` line with a newer version.
- Upgraded direct ESLint packages to current lines.
- Upgraded direct SocketCluster packages to 20 where applicable.

What is still noisy:

- Remaining npm warnings are now mostly:
  - Jest / `ts-jest`
  - `glob` transitive warnings from those stacks

What not to do:

- Do not casually remove optimization paths like SVG/image optimization without first deciding how that optimization is supposed to be preserved.
- There was already one bad example of overreaching cleanup here. Keep future dependency cleanup focused on "replace with equivalent" rather than "delete and hope".

## Where The Project Is Now

The repo is in a much healthier state than it was before this pass.

What feels solid:

- `core` package shape
- server ESM/runtime architecture direction
- restored single-player default flow
- working terminal client
- much cleaner understanding of where the real transport and test debt lives

What still feels transitional:

- SocketCluster adapter internals in `server`
- integration/Jest ergonomics
- dependency-tree cleanliness around Jest / `ts-jest`
- some old experiments (`controller/3`, `MultiGame`, mirror/multiplayer branches) still living beside the now-canonical paths

Best next moves after this checkpoint:

1. Finish the single-player merge checkpoint and merge this branch once the user-facing flow feels boring/stable again.
2. If more npm-warning cleanup is desired, focus on replacing `ts-jest`, not random lockfile whack-a-mole.
3. Later, return to server runtime cleanup:
   - split `runtime/socketcluster.ts`
   - clarify runtime API concepts
   - reduce transitional types
4. Only after that, revisit multiplayer / server-authoritative work with a cleaner head.

## 2026-04-18 Server Transport / Module Refactor Checkpoint

Completed:

- Promoted the old `server2` experiment into the real `server` workspace and removed the old legacy server tree.
- Migrated `server` to ESM end-to-end.
- Replaced the old class/inheritance module pattern with declarative server module definitions.
- Added a runtime abstraction layer under `server/gameserver/runtime/`.
- Ported all server modules onto the new module definition shape:
  - `auth`
  - `scores`
  - `lobby`
  - `match`
  - `game`
  - `sync`
- Deleted `AbstractServerModule`.
- Replaced the old fake socketcluster-14 compatibility wrapper with a real socketcluster transport adapter:
  - deleted `server/legacy-compat.js`
  - deleted `server/gameserver/compat.ts`
  - added `server/gameserver/runtime/socketcluster.ts`
- `GameServer` now depends on `TransportRuntime`, not a pretend legacy server surface.
- Topic middleware now binds through `services.transport` rather than using hidden compat backdoors.

Important design landing spot:

- Module intent is now expressed as:
  - procedures
  - topics
  - `onConnect`
- Transport concerns are concentrated in the runtime/adapter layer.
- This is a materially better shape for a future socket.io adapter.

Single-game hardening completed after the transport rewrite:

- `ServerSingleGameController.setState()` now resets timing/history state rather than only swapping FSM/game state.
- `game` module state is now keyed by connection instead of relying on one ambient `serverGame`.
- Stale or invalid single-game moves are ignored when:
  - the controller is not in `Playing`
  - the move frame is already in the past

Why this mattered:

- Continuing after a win could wedge the server into a bad state because stale move input was being replayed against a controller whose history/timing state had not actually been reset.
- When that happened, later `Game:CreateSingle` requests could time out and frontend reconnect behavior would look like a transport failure even though the real fault was server-side game-state corruption.

Current validation status:

- `npm run build -w mrdario-server` passes under Node 20.
- `npm run build -w mrdario-integration` passes under Node 20.
- Basic server flows appear to work again after the adapter swap, but there is still some expected post-refactor “ghost hunting” risk in low-traffic paths.

What is cleaner now:

- No more fake legacy socketcluster server object.
- No more `AbstractServerModule`.
- No more hidden `__compatServer` escape hatch inside runtime registration.
- The architectural seam between:
  - modules
  - runtime
  - concrete transport adapter
  is now real.

What is still not fully clean:

- `runtime/socketcluster.ts` still does multiple jobs:
  - socket wrapping
  - listener/procedure bridging
  - middleware stream bridging
  - responder normalization
- `ClientConnection.on(...)` is still a very permissive old-world abstraction which blurs:
  - fire-and-forget events
  - request/response procedures
  - local socket lifecycle events
- Dynamic game topics like `game-${id}` are still published ad hoc rather than through a more semantic room/topic abstraction.
- Some old server/game behavior remains intentionally tolerated rather than properly modeled, especially around single-player continuation flows.

Recommended next abstraction steps:

1. Split `runtime/socketcluster.ts` into smaller transport-adapter pieces:
   - connection binding
   - request/procedure binding
   - middleware/topic plumbing
   - error normalization
2. Make procedures/events first-class runtime concepts instead of relying on generic `connection.on(...)` for everything.
3. Introduce a more semantic topic/room abstraction for dynamic channels such as `game-${id}`.
4. Decide whether single-game state should become an explicit server-side session concept instead of “current game for this connection”.
5. Once the runtime shape is stable, design a parallel socket.io adapter against the same runtime contract as a reality check.
## 2026-04-18 Node 20 / npm / Audit Follow-Up

Completed:

- Repo is now using npm workspaces with `package-lock.json` as the canonical lockfile.
- Node 20 is the intended repo baseline via `.nvmrc`.
- `bots` and `integration` were moved off the old Jest 26 / ts-jest 26 island onto Jest 29 / ts-jest 29.
- Added dedicated `tsconfig.jest.json` files for `bots` and `integration` using explicit `node16` module/moduleResolution for TS 6 compatibility.
- Fixed `integration/tsconfig.json` by adding explicit `rootDir: "./src"`.
- Fixed `web-client`'s `image-webpack-loader` crash on Node 20 / webpack 5 by replacing the legacy query-string loader syntax with explicit loader `options` while preserving the image optimization settings.
- Fixed `ClientGameController3` test cleanup so timer/listener leaks no longer continue after the test finishes.

Important lessons / guardrails:

- Always run repo package-manager commands under `nvm use` from the repo root; do not trust the ambient shell node version.
- Build/output optimization is behavior. Treat image/svg optimization changes as behavioral changes, not disposable cleanup.
- If TypeScript deprecates something, prefer fixing the real cause over adding `ignoreDeprecations`.

Audit status snapshot:

- The easiest critical class (`@babel/traverse` via old Jest 26 pockets) was addressed by the `bots` / `integration` Jest upgrades.
- After that, the remaining criticals are in the SocketCluster / legacy server ecosystem.
- There are also high/moderate findings in old loader/dev-server/redis/server dependencies, but the SocketCluster stack is the main genuinely invasive remaining audit problem.

Current migration reality:

- `server/src/server.ts` and `server/src/broker.ts` are still very close to old SocketCluster generator/boilerplate structure.
- Most actual application logic lives below that thin shell:
  - `server/src/worker.ts`
  - `server/src/gameserver/**`
- This makes a future “generate fresh SocketCluster boilerplate, then transplant app logic” strategy plausible.

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

## 2026-04-18 `server2` SocketCluster 20 Migration Spike

Completed:

- Created a new `server2/` based on fresh SocketCluster 20 boilerplate, leaving the old `server/` untouched.
- Preserved the modern SocketCluster 20 single-process shell in `server2/server.js`.
- Added a thin transitional compatibility layer in `server2/legacy-compat.js` so the old game-server logic could mount without rewriting every module immediately.
- Copied the old `gameserver` logic into `server2/gameserver/`.
- Moved `server2` away from the failed runtime `ts-node`/ESM hack:
  - `server2/gameserver` now compiles to `server2/dist/gameserver`
  - `server2/server.js` imports the built output instead of requiring `.ts` at runtime
- Added `server2/tsconfig.json` and a `server2/gameserver/package.json` boundary so the copied game-server code can build as CommonJS while the outer server shell remains ESM.
- Rewrote copied `server2/gameserver` imports to use `mrdario-core/lib/...` instead of `mrdario-core/src/...` where runtime JS resolution mattered.

What the compat layer currently does:

- Adapts SocketCluster 20 `agServer` to enough of the old `SCServer` surface for the copied `GameServer` to run:
  - `scServer.on("connection", ...)`
  - `scServer.addMiddleware("publishIn" | "publishOut", ...)`
  - `scServer.exchange.publish(...)`
- Adapts `AGServerSocket` to enough of the old `SCServerSocket` surface for the copied modules to run:
  - `socket.on(...)`
  - `socket.off(...)`
  - `socket.emit(...)`
  - `socket.setAuthToken(...)`
  - `socket.deauthenticate()`
- Bridges old callback-style request handlers onto SocketCluster 20 procedure streams.
- Gives non-RPC transmitted events a harmless no-op responder so old auth/validation wrappers do not explode when they blindly call `respond(...)`.

Important reality:

- This works as a transitional canary bridge.
- It is not the clean end state.
- The module boundary (`server2` ESM shell + built CommonJS `gameserver`) is pragmatic, not elegant.
- The compat layer is intentionally ugly: it exists to preserve behavior long enough to prove where the real SocketCluster 20 mismatches are.

Validation status:

- `cd server2 && npm run build` passes under Node 20.
- `node server2/server.js` gets past the old ESM/CJS import failure.
- Full runtime validation inside Codex sandbox is not possible because the sandbox forbids:
  - listening on server ports
  - connecting to Redis
- So meaningful canary validation needs to happen in the real local shell, ideally using the existing integration suite as the behavioral check.

Likely next cleanup direction:

- Reduce or delete the compat layer by porting `server2/gameserver` to native SocketCluster 20 APIs directly.
- Collapse the ESM/CJS split by deciding on one module strategy for `server2`:
  - either real ESM all the way down
  - or a deliberate CommonJS server package
- Keep using the integration suite as the first serious canary for transport/protocol regressions during that cleanup.

## 2026-04-18 `server2` Promotion to Real `server`

Completed:

- Promoted the SocketCluster 20 spike into the real `server/` workspace.
- Deleted the old legacy server code after parity was good enough locally.
- `server` is now the canonical `mrdario-server` workspace package; there is no longer a split between `server` and `server2`.

Important structural changes:

- `server` now builds and runs as ESM end-to-end.
- The old CommonJS shim inside `gameserver/` was removed:
  - deleted `server/gameserver/package.json`
  - deleted the old "inner CommonJS / outer ESM" behavior
- `server/server.js` now imports built ESM directly from `./dist/gameserver/GameServer.js`.
- `server/tsconfig.json` is on `module: "nodenext"` / `moduleResolution: "nodenext"` and includes local ambient declarations.

Important compatibility work needed to make this run:

- Added `server/gameserver/compat.ts` as the type-level description of the legacy SocketCluster compatibility wrapper surface.
- Added `server/gameserver/ambient.d.ts` for `@ircam/sync/server`.
- Updated `server/gameserver` imports for Node ESM:
  - explicit `.js` relative imports
  - explicit package file imports where older packages pretend to be modern ESM but are not
- Cleaned up runtime CJS interop footguns in server code:
  - `lodash`
  - `tweetnacl`
  - `@ircam/sync`
  - `io-ts`
  - `fp-ts`

Important outcome:

- `npm run build -w mrdario-server` passes under Node 20.
- `npm run start -w mrdario-server` now gets past the old module-format/runtime import failures.
- Remaining server cleanup is now architectural, not module-system triage.

Open design debt:

- `server/legacy-compat.js` still exists and is intentionally transitional.
- The runtime behavior is preserved through the compat layer, but it is not the desired end state.
- Next meaningful cleanup is to port `gameserver` modules directly to native SocketCluster 20 semantics and delete the compat layer in slices.

## 2026-04-18 `integration` ESM + Jest Recovery

Completed:

- `integration` is now aligned with the repo's ESM direction:
  - `integration/package.json` has `"type": "module"`
  - `integration/tsconfig.json` is on `module: "nodenext"` / `moduleResolution: "nodenext"`
- Updated local relative imports in `integration/src` to use explicit `.js` targets for built ESM output.
- Fixed `integration` package build:
  - proper Node/Jest types in tsconfig
  - tiny local `redis` ambient declaration
  - strict-mode callback typing cleanup in `src/utils/redis.ts`

Most important Jest decision:

- Stopped using `ts-jest` for running integration tests.
- `integration` tests now run against built JS in `integration/lib/`, not live TypeScript transforms.
- This avoids the persistent `ts-jest` / TS 6 `moduleResolution=node10` ghost that kept reappearing despite correct visible config.

Current Jest shape:

- `npm test` in `integration` now does:
  1. `npm run build`
  2. `node --experimental-vm-modules ... jest --config jest.config.cjs`
- `integration/jest.config.cjs` now points roots at `lib/`.
- `integration/configs/jest.setupAfterEnv.mjs` closes the Redis singleton from built JS.
- The brittle npm CLI lookup in `integration/configs/jest.globalSetup.cjs` was replaced with a simpler "use `npm_execpath` if present, else spawn `npm`" strategy.

Behavioral outcome:

- The old `Cannot find module 'mrdario-core/...'` Jest failures are gone.
- The old `Must use import to load ES Module` setup-hook failures are gone.
- The old `moduleResolution=node10` TS 6 deprecation failure is gone by construction because tests no longer pass through `ts-jest`.

Local verification outcome:

- On the real local shell, `integration` tests are back to running and mostly passing.
- One lingering ESM Jest cleanup was needed:
  - `integration/src/tests/lobby.test.ts` now imports `jest` explicitly from `@jest/globals`
  - `lodash` interop there was normalized to a default import

Role of the suite going forward:

- `integration` is once again a credible canary for server/socket/protocol regressions.
- This is especially important now that `server` is the SocketCluster 20 port.
- If future changes break auth, lobby, match, or single-game request flows, this suite should be one of the first places it squeals.
