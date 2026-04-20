# Lessons Learned

This document exists to prevent repeat mistakes during ongoing modernization work.

## Package Management

- Use the npm CLI to add, upgrade, and remove dependencies. Do not hand-edit workspace `package.json` files and assume the lockfile will sort itself out later.
- For workspace-scoped dependency changes, use commands like:
  - `npm install -w server redis@^5.12.1`
  - `npm remove -w web-client image-webpack-loader`
- After dependency churn, verify the actual installed version the workspace resolves:
  - `cd server && node -p "require.resolve('redis/package.json') + ' ' + require('redis/package.json').version"`
- If behavior and manifests disagree, suspect stale nested `node_modules` or a poisoned `package-lock.json` before changing code again.
- In this repo, bad lockfile state can resurrect old workspace-local installs even when the manifest is correct.

## Do Not Remove Intentional Behavior Without Approval

- Do not remove optimization paths just because they look old or inconvenient.
- If a package appears to be performing real work, replace it with an equivalent modern path instead of deleting it.
- The burden of proof is on removal, not on preservation.
- This applies especially to:
  - image optimization
  - SVG optimization
  - build-time asset handling
  - render/update performance controls

## Preserve Package Boundaries

- Do not make one workspace depend on another workspace's build config unless that dependency is explicitly intended.
- `web-client` should stand on its own.
- `scripts` should stand on its own.
- Small duplicated config is better than accidental cross-package coupling.

## Diagnose Before Refactoring

- Do not "fix" a bug by ripping out optimizations or lifecycle controls unless the diagnosis is strong.
- A plausible theory is not enough when the change removes a deliberate performance or rendering guard.
- Prefer:
  1. isolate the failing seam
  2. confirm the actual runtime behavior
  3. make the smallest reversible fix
- In particular, do not remove `shouldComponentUpdate` or similar controls as a first move without solid evidence.

## Distinguish Code Bugs From Environment / Install Bugs

- If runtime behavior contradicts the code, check resolved package versions and local installs first.
- Do not keep rewriting code to satisfy errors caused by stale dependencies on disk.
- Check the actual installed module version before assuming an API is wrong.
- Mixed-version workspace installs are common failure modes in this repo.

## Avoid Lazy Type Escapes

- Do not paper over library typing problems with `as whatever` unless there is no better option and the cast is tightly justified.
- Prefer:
  - real narrowing
  - explicit adapters
  - wrapper functions that convert ugly library reply types into sane local types
- If a cast is temporarily unavoidable, leave it localized and deliberate, not smeared through domain code.

## Treat Deprecations As Real Work

- Do not paper over deprecation notices or hand-wave them away if they are reasonably fixable.
- If a deprecation is in direct project dependencies, prefer fixing it at the source instead of normalizing the warning.
- Distinguish between:
  - upstream/transitive noise you cannot realistically fix rn
  - direct or replaceable dependencies you actually can modernize
- When something cannot be fixed immediately, document why it remains instead of pretending it is fine.

## Follow Through On Runtime Semantics

- Upgrading a library means updating both:
  - import/type surfaces
  - actual runtime call patterns
- Do not stop at "the type import compiles" if the runtime API is still old.
- Example failure mode:
  - updating Redis types without updating connection/bootstrap or callback-era method usage

## Respect User Direction On Scope

- If asked to preserve behavior, preserve behavior.
- If asked not to remove or simplify something, do not silently "improve" it away.
- If multiple paths exist, avoid taking the more invasive one unless it is clearly necessary.

## Prefer Concrete Verification Over Vibes

- When changing build or transport infrastructure, validate with the real workspace build or test command that exercises the path.
- When a theory is uncertain, say so.
- Do not present speculative diagnoses as settled fact.
- For build tools, loaders, bundlers, package managers, and framework/plugin config behavior, read the actual docs before asserting what a config will do.
- Do not guess about tool semantics when the answer is documentable.

## Repo-Specific Reminders

- This repo uses npm workspaces. Root and workspace install state both matter.
- Old experiments still exist. Do not "clean them up" just because lint now sees them.
- Single-player restoration and stability matter more than architecture heroics right now.
- Future cleanup should bias toward principled replacement, not casual deletion.
