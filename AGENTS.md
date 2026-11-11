# Liverary

## Fork maintenance

- Keep `main` as the only repository branch. Use a detached worktree when isolation is needed; create or publish another branch only when the user requests one.
- Integrate upstream stable release tags as complete releases. Do not follow individual development commits unless the user asks for a specific urgent fix.
- App and CLI releases use one stable `X.Y.Z` stream. Do not restore Nightly or preview release queries, channel APIs/settings, installers, build variants, or assets. Provider-owned update channels and mobile development variants are separate features.
- Keep excluded upstream-only code out of future merges: `docs/`, `.repos/`, `apps/marketing`, `infra/relay`, `infra/task-cache`, `packaging/aur`, private task-cache configuration, the original `t3` npm publisher/legacy launcher, and their unused automation. Resolve delete/modify conflicts by checking remaining consumers and preserving the exclusion; do not replace this with runtime flags or compatibility paths. Keep the working provider adapters, mobile client, and remote connection clients unless a requested product change removes them.
- Start source maintenance through **설정 → 정보 → T3 Code 기능 반영**: check the latest stable release, select an already connected subscription-authenticated provider and model, and launch a new native agent thread following [.github/upstream-maintenance.md](.github/upstream-maintenance.md). **Liverary 앱 업데이트** and the sidebar updater only update published app/environment/provider versions; they must not start source maintenance. Do not create scheduled tasks, another AI connection, or an API-key workflow for source maintenance. The **Check T3 Code releases** workflow is a manually dispatched metadata fallback that records release status in one issue; it does not merge or translate.
- Run maintenance from this repository's source checkout with GitHub push access in the agent's environment. Subscription authentication and GitHub authentication are separate. Use the project checkout without automatically creating another branch. Report progress and any required approvals in the new Liverary thread.
- Track completion against the published release tag's ancestry, not only `main`. Do nothing when that release already includes the latest stable upstream commit and no unpublished release request remains. Monitor active build/publish runs without duplicating them. Use the existing issue, Git history, release request, and releases between sessions; do not add parallel progress documents. Report the outcome in the Liverary conversation and distinguish a launched task from a published release.
- Preserve the pre-update fork's Korean modules in `apps/web/src/locales/ko/` and `apps/desktop/src/locales/ko.ts`. Merge upstream behavior into app source normally, keeping or adapting its Korean render bindings; do not restore whole app source files from either side to resolve translation conflicts. An upstream update is complete only after added or changed desktop/local-web UI strings are translated through these modules and affected display assertions are updated. Include form titles, descriptions, and placeholders supplied by server schemas. Preserve protocol IDs, commands, and model-facing prompts.
- After integration, run scoped checks against the pre-update `main` and one integrated desktop build. Follow the verification rules below; the primary agent owns integrated validation.
- Use Liverary for this app's branding, assets, CLI and product identifiers: `liverary`, `~/.liverary`, OS profiles `liverary`/`liverary-dev`, app ID `io.github.andongmin94.liverary` and external `liverary://` links. Keep the existing release/update destination and opaque installer upgrade identity. Migrate only this fork's old custom data/profile directories, preserving bytes and old path aliases; refuse active owners or conflicting real directories rather than overwriting them. Use `liverary://app` (`liverary-dev://app` in development) for the renderer and the same Liverary schemes for external links. Do not restore old product URL schemes or a separate internal branding namespace. Keep actual external service names and license notices accurate. Do not automatically import upstream `.t3` or T3 Code profiles. Local use remains independent of T3 Connect; provider authentication and network access controls remain required.
- Use `liverary.json` for checked-in project configuration and `.liverary/vcs.json` for VCS selection. Read legacy `t3.json` and `.t3code/vcs.json` only when their canonical counterpart is absent; do not merge them or hide invalid canonical files with legacy values. Keep server, web, mobile, and worktree consumers aligned.
- Preserve `assets/custom/`, especially the user-supplied source `assets/custom/liverary-app-icon.svg`, across upstream merges. After resolving source changes, regenerate production assets with `vp run icons:export --brand production` and verify them with `vp run icons:check --brand production`; keep the web logo copy, Icon Composer source copy, and desktop/web/mobile consumers connected to that source through the existing asset pipeline. Review upstream asset-mapping changes without replacing the source art. Do not add blanket `merge=ours` attributes or an app-wide merge strategy to preserve branding or translations.
- After resolving upstream conflicts, audit added or changed app-visible `T3`, `T3 Code`, `t3`, and `t-3` names, including examples and placeholders, and replace this app's branding with Liverary. Use the canonical Liverary names in creation code and examples. Preserve existing saved paths through migration aliases, required legacy upgrade inputs, provider/protocol identifiers, environment variables, external product names and attribution; do not restore old custom names as new product defaults or perform a repository-wide replacement. A successful merge does not establish that this audit passed.
- Set the Electron runtime name `Liverary ${stageLabel}` before readiness and keep it throughout startup. Persist desktop connections in `liverary-connections.json`; do not import earlier encrypted connection catalogs or add old-keyring decryption paths. Keep project/conversation databases and provider credentials separate from desktop login state.
- Keep T3 usage analytics disabled by default at runtime, including server analytics identity collection while disabled. Preserve explicit provider requests and user-configured diagnostic exports; do not restore upstream star promotions or recovery destinations.
- During an upstream merge, preserve `.github/workflows`, `.github/actions`, `.github/upstream-maintenance.md`, this file, README, and `.github/liverary-release.json` from the pre-update fork. Then update README's upstream base and the release request deliberately. If upstream requires automation changes, explain the required maintenance instead of replacing the fork's automation.
- Prepare `.github/liverary-release.json` with exactly five string fields: `version`, Korean `changes`, `base_sha`, `upstream_tag`, and `upstream_sha`. The upstream tag and SHA identify the same integrated stable release and are pinned to the built app; never display remote main or the latest published app's base as the running app's base. Run `node scripts/update-release-package-versions.ts <version>` to keep the web, desktop, and server package versions aligned, then run scoped checks and commit the source, package versions, and release request together. Private shared packages keep independent versions. Preserve a genuine upstream merge parent with a normal Git merge commit. `base_sha` must equal remote `main` immediately before the atomic push (`event.before`). If `main` moves, recompute the changes and manifest and repeat scoped checks against the new base before a normal push. A changed source must use a version above both the latest published version and any failed release request; retry the same source without inventing another commit.
- A release-request change on `main` triggers **Build Liverary desktop**, including reusable CI checks, one desktop bundle build, Windows and macOS arm64 app verification, and the Linux CLI needed for WSL, followed by **Publish Liverary release**. macOS artifacts are for validation; publish Windows installers and Windows/Linux CLI archives. Publish the verified artifact and its recorded source/version without rebuilding it. Manual build/publication remains available. Follow [README.md](README.md) for setup and release operations.

## Project context

Liverary is a Korean-focused desktop and local-web fork of T3 Code. The server wraps provider CLIs and SDKs; shared contracts also serve the upstream mobile client. Keep changes scoped to the requested product behavior and use the existing services, adapters, and UI components.

An environment owns its filesystem, credentials, and server state. A project is a workspace in that environment; a thread is its durable conversation, and a turn is one user-to-agent cycle including checkpointing.

## The three ways to hurt yourself

1. **Killing by pattern.** Never `pkill -f`, `pgrep | kill`, or `kill` a PID you found by matching a name, path, or worktree string. Your own agent process has this worktree's path in its argv, and this machine runs several other dev servers at once. Kill only a PID you captured at spawn, or the owner of your port from `ss -H -ltnp` after confirming `/proc/<pid>/cwd` is your worktree.
2. **Writing to the live install.** `~/.liverary/userdata`, legacy `~/.t3-custom/userdata` and upstream `~/.t3/userdata` may contain live application data. Reading or copying for a sandbox is fine (see Test data). Never start a test server or run migration checks against them, open their databases read-write, or clean them up. Migration tests use temporary directories.
3. **Baking in origins.** Never set `VITE_HTTP_URL` or `VITE_WS_URL` for dev. Dev is single-origin and Vite proxies `/api`, `/ws`, `/oauth`, and `/.well-known`. Setting them bakes localhost into the bundle and silently breaks every remote browser.

## Hit every surface

The most common defect in this repo is a change that works on the path you tested and is missing everywhere else. Before calling frontend work done, walk this list and say which entries applied:

- **Entry points.** A behavior reachable from the chat view is usually also reachable from Settings, the command palette, and a keybinding. Fixing one is not fixing the feature.
- **Clients.** Web, desktop (wraps web, adds Electron shell/IPC), and mobile (React Native, separate navigation). Shared logic lives in `packages/client-runtime`
- **Providers.** Check the current drivers in `apps/server/src/provider/builtInDrivers.ts`. Provider-shaped features need a decision per affected adapter, even if the decision is "not supported here".
- **Agents.** A capability a user can trigger is usually one an agent should reach through MCP tools, and scheduled tasks run the same paths. That only works when it is a service method, not handler code.
- **Contracts.** Anything crossing the wire is typed in `packages/contracts`. Change the schema and the server, web, mobile, and desktop all follow.
- **Reverse states.** If you added a way in, add the way out and the way to see it. Snooze needs unsnooze. Close needs reopen. A one-way door is a bug.
- **Connection modes.** Local, remote/relay, and tunnel behave differently. Multi-device and multi-environment cases are real.
- **Docs.** Check whether the change makes existing guidance inaccurate. Apply the [documentation rules](#documentation) before adding anything.

## Dev servers

- `vp i` installs. Worktrees get this from the liverary.json setup script; if module resolution looks broken, it probably did not run.
- Setup runs in the background. While `.t3/setup-running` names a live PID, wait for it and do not run `vp i`. It ends with `.t3/setup-done` or `.t3/setup-failed` (with the error tail). With no marker at all, setup never ran here, so run `vp i` yourself.
- `vp run dev` and `vp run dev:desktop` use the same `~/.liverary/userdata` as the installed app. `T3CODE_HOME` overrides the default and `--home-dir` takes precedence. For tests start with `vp run dev --home-dir ./.t3` or another isolated base directory.
- Ports derive from the worktree path and are stable across restarts, but read the real ones from the `[dev-runner]` line since occupied ports shift.
- To share a test environment over the tailnet, run `vp run dev --home-dir ./.t3 --share` in the background, wait for the `pairingUrl:` line in its output, then give that full URL to an unpaired browser. Do not wire up `tailscale serve` by hand, open the URL yourself, or consume the user's pairing link. A browser with the reusable dev cookie can use the bare origin. If a normal one-time token was consumed, mint a fresh one with `node apps/server/src/bin.ts pair --base-dir ./.t3`. It carries standard scopes, while the startup URL carries admin scopes needed for Connections settings.
- To reuse web dev auth across worktrees, configure one fixed `T3CODE_DEV_AUTH_TOKEN` in the main checkout's gitignored `.env`. The `liverary.json` setup links that file into worktrees. Never commit or publish the token or a startup URL.
- Stop what you started, by the PID you tracked. See rule 1.
- Need a second checkout? `git worktree add` it next to this worktree, not in `/tmp`. Remove it when done.

## Test data

An empty database is a bad test. Seed your worktree's `.t3` with a copy of real data instead of pointing at live state:

- The first `vp run dev --home-dir ./.t3` in a linked worktree does this for you when its database is missing and the source is at most 500 MiB. Larger sources warn and dev starts with an empty database. `--no-seed` or `T3CODE_DEV_SEED=0` skips seeding. Manual migration still accepts larger sources and may use substantial disk space before pruning.
- Run `vp run migrate-dev-db` with your dev server stopped to refresh. It rebuilds `<worktree>/.t3/userdata/statev2.sqlite` from a read-only snapshot of `~/.t3/userdata/statev2.sqlite`, the developer's real data. It keeps recent projects and their stopped threads, and drops scheduled tasks, pending work, auth sessions, and links to other environments, so your dev server never runs the developer's agents or reaches their other machines. Raise `--projects` and `--threads-per-project` for more data.
- Refresh `statev2.sqlite`, not `state.sqlite`. The server copies the V1 `state.sqlite` only when `statev2.sqlite` is missing.
- Bring `secrets` and `settings.json` only if the flow under test needs them.
- Copy in, never symlink. Data flows one way: into your sandbox, never back out.

## Verifying

- Before you push, run `vp run check:changed`. It runs CI's fast checks for changed files: format, lint, knip, typecheck of affected packages and dependents, tests beside changes, and the cross-file checks those miss. CI also builds the desktop app and verifies web startup when a change can affect the bundle or its build. Manual CI and release builds always run both steps.
- While you iterate, run `vp test run <files>`. For big files, add `-t "<name>"`.
- Use `vp run typecheck`, not `npx tsc`; it caches per package. Both run tsc-rs (`typescript` is the `@tsc-rs/typescript` drop-in).
- Run `node -e` snippets from `apps/server` or the owning package. `effect` does not resolve from the repo root.
- Test behavior that can break, such as orchestration and event-sourcing, provider protocol translation, auth and permission guards, persistence and migrations, external-format parsing, race fixes, and the logic a bug fix changed. Leave out tests for what types already guarantee, trivial logic, copy text, smoke runs, mock-call mirrors, callback wiring, and props rendered to static markup.
- Extend before you add. When an existing test or table covers the behavior, add a row or an assertion there. Write a new `it` only when no case fits.
- Test at one layer: the lowest one that fails on `main`. Do not repeat the case in a wrapper test, at each call site, or in web and mobile copies of the same logic.
- **Do not run repo-wide checks.** No `vp check`, no `vp run -r test`, no `vp run -r typecheck` unless I ask. Use this fork's configured CI and release checks for integrated validation.
- Backend behavior changes ship with focused tests for that behavior.
- Proof for a bug fix depends on the bug. Logic, data, state, and protocol bugs get a failing test first (the fewest that fail on `main` for that reason, in an existing case of the module's test file where one fits), then the fix. Purely visual bugs (spacing, colour, alignment, a layout shift) get before/after captures as their proof and no test: do not add UI tests for nitpicks, and do not ask for one in review when a capture already shows it. A server-only fix with no visible surface ships the test plus a short runtime transcript.
- The server is event-sourced, and side effects run after the command commits. In tests, drain the effect worker (`OrchestrationEffectWorkerV2.drain`) or await the specific persisted event or `Deferred` that marks the milestone. Never wait on sleeps or polling. A test that needs a timeout to pass is wrong. Concretely:
  - `it.effect` runs on a `TestClock`; `Effect.sleep` only advances through `TestClock.adjust`. `it.live` is wall-clock and only for subprocess or network fixtures.
  - No `yieldNow` or `sleep` polling loops. Await the `Deferred`, take from the `Queue`, or drain the worker.
  - No per-test timeout argument or `retry`. The project timeout is the ceiling, and flaky tests are fixed, not retried.
  - No `performance.now()` or `Date.now()` deltas. Assert on events and counts, not elapsed time.
  - Browser tests assert through `expect.element` or `vi.waitFor`, never `requestAnimationFrame` or `transitionend`.
  - `vi.mock` factories must not spread a real module that pulls in Shiki or the diff workers.
  - `it.skip` and friends need a tracking issue on the line above: `// quarantine: #1234 <why>`.
  - Lint enforces this: `t3code/no-test-timeout-or-unreasoned-skip`, `t3code/no-frame-waits-in-browser-tests`, `t3code/no-wall-clock-in-tests`, `t3code/no-real-time-wait-in-tests`, `t3code/no-polling-loop-in-tests`.
- Web browser tests are `*.browser.test.tsx` or `*.browser.test.ts` and render with `await using screen = await render(...)` from `apps/web/test/render.tsx`. `t3code/require-disposable-render` errors on the old patterns.
  - Acquire what the test drives after mounting (fake timers it advances, spies it sets up after mounting) after the render, so it disposes before the unmount. Anything the first render reads comes before it.
  - A helper that renders and then waits or clicks puts the screen in an `AsyncDisposableStack` and `move()`s it out only on success, so a failed wait still unmounts.
  - `rerender` needs a fresh element on every call.
  - No lifecycle hooks and no module-level mutable state. Shared mock state that `vi.mock` factories read is reset by a `setup()` call at the top of the test.
  - `router` is on by default. Pass `router: false` only with a one-line comment saying why.

  ```tsx
  it("saves on Enter", async () => {
    const onSave = vi.fn();
    using _now = vi.spyOn(Date, "now").mockReturnValue(0);
    await using screen = await render(<TitleEditor onSave={onSave} />, { router: "/threads/1" });
    await userEvent.type(screen.getByRole("textbox"), "Title{Enter}");
    expect(onSave).toHaveBeenCalledWith("Title");
  });
  ```

- User-visible frontend changes should get one integrated pass in a real client: `test-liverary-app` for web, `test-liverary-mobile` for mobile. The primary agent does this once after integrating. Subagents do not launch their own dev servers.

- Real agent turns cost money. To watch a turn stream through the pipeline and UI, use the free `Replay (dev)` provider that `vp run dev` registers; [test-liverary-app](.agents/skills/test-liverary-app/SKILL.md) shows how to start one. Use a real provider only when the change depends on that provider's behavior, and then pick its cheapest model, such as Haiku for Claude or Luna for Codex.

For mobile verification, a missing or outdated native client is an install step, not a blocker. Run `vp run mobile:install <ios|android> [device-id]` on the device host before starting Metro; it targets the only booted simulator or connected Android device when the id is omitted. It reuses the matching installed client or local native-build cache and builds when neither is available, so prefer it over `expo run:*`, `xcodebuild`, or `gradlew`, which rebuild from scratch. Its stdout is one JSON line; build output goes to the log it names. See `test-liverary-mobile` for the full workflow.

## Evals

`evals/` checks how real models behave with Liverary's model-facing text: agent instructions, MCP tool descriptions and schemas, and generated titles. Before you change that text, read [evals/README.md](evals/README.md) and run the evals it names. When you fix a model behavior bug, add a case that fails before the fix.

## Pull requests

- Never make a PR unless the developer explicitly asks you to do so.
- Conventional commit titles, plain language: `fix(web): new threads no longer spike CPU`.
- Body: the problem in a sentence or two, then how you fixed it. End with the model and harness that did the work.
- UI changes need before/after images. Motion or timing needs a short video.
- Upload PR evidence to GitHub. Never commit PR-only screenshots or assets such as `.github/pr-assets/`.
- One request is one PR. Split it only when the maintainer asks. Outside contributions follow the stricter [one problem per PR](CONTRIBUTING.md#one-problem) rule.
- When babysitting: call `watch_pull_request` and end your turn. Liverary wakes you on checks, comments, or conflicts. Do not poll or sleep. Verify each bot finding against the source, fix real ones, dismiss false positives with a written reason. Stay quiet when nothing is new. Stop when the bots are green on the latest commit.

## Documentation

- Keep installation, usage, and release instructions in [README.md](README.md), implementation rules here, and upstream integration steps in [.github/upstream-maintenance.md](.github/upstream-maintenance.md).
- Do not restore the removed upstream `docs/` or `.repos/` trees during merges or create replacement copies. Read dependency types from installed packages and consult their official source when needed.
- Update existing guidance only when the change affects a user's task or a maintainer's operating procedure. Code, types, and tests already record implementation details.
- Explain a local invariant or external constraint in a short nearby comment. Do not add file catalogs, implementation narratives, progress logs, or duplicate checklists.

## Plans and work artifacts

- Do not commit implementation plans, research notes, or agent scratch files. Keep temporary working material outside the worktree. `.plans/` is gitignored only as a safety net for legacy tooling.
- Track active maintainer work in the GitHub issue or project item that owns it. Proposals follow [CONTRIBUTING.md](CONTRIBUTING.md).
- A merged PR is the implementation record. Close or update its tracking item when the work lands; do not preserve a second checklist in the repository.

## How it works

Clients send typed WebSocket requests. The server turns them into _commands_. The _orchestrator_ (`apps/server/src/orchestration-v2/Orchestrator.ts`) serializes commands and decides _events_ without doing any I/O. The _event sink_ commits those events, the _projections_ the UI reads, the _command receipt_, and _outbox_ effects in one transaction. The _effect worker_ then runs the effects, such as starting a provider turn or capturing a checkpoint, and feeds results back as commands. Provider CLIs run as subprocesses; per-provider _adapters_ translate their native protocols into orchestration events. Each turn ends with a _checkpoint_, a hidden git ref, so the app can diff and restore.

## Where code lives

- `apps/server` - WebSocket, orchestration, providers, checkpointing. Follow neighboring Effect services and the installed dependency's types.
- `apps/web` - React/Vite UI. `apps/desktop` wraps it, and `apps/mobile` is React Native.
- `packages/contracts` - Effect/Schema contracts plus small derived helpers. No heavy runtime logic.
- `packages/shared` - shared runtime utils, subpath exports, no barrel.
- `packages/client-runtime` - client code shared by web and mobile.

## Taste

- Complexity belongs at the adapter boundary. Orchestration stays pure, UI stays dumb.
- Client mutations use `createEnvironmentRpcCommand`. Add protected methods to `CLIENT_GUARDED_RPC_SCOPES` in contracts and use the command's `permissionAtom` for UI availability. Grants are checked at execution against the destination environment; the server remains authoritative. Keep raw RPC clients inside `rpc/`, and extend the permission behavior tests when adding a protected method.
- Server features are services; transports stay thin. A `ws.ts` RPC handler, HTTP route, or MCP tool decodes input, calls one service method, and maps errors.
- `apps/web/src/components/ui` exports own their look. Pick a `variant` or `size`; do not restyle one with `className`. If none fits and the look is a generic concept, add a variant to the component; a look that belongs to one feature stays in that feature's own component, not in `components/ui`. Layout classes (width, flex, margin, position) belong on the parent. `shadcn/no-restyle` fails lint on violations.
- Reusable Effect functions use `Effect.fn("Service.operation")` with a stable span name, not a
  function wrapping `Effect.gen`. Keep `Effect.gen` for inline programs and layer construction.
  Use `Effect.fnUntraced` only when spans would be too frequent (stream chunks, per-event
  projection, tight loops) or duplicate an existing tracing boundary; explain that choice nearby.
  Named `Effect.fn` creates a span; the unnamed form does not. Preserve existing span names and
  options, and pass combinators as additional function-builder arguments.
- Inferred types over annotations. `any` is the enemy.
- Default to no comment. Write one only for a constraint, an external quirk, or an invariant the code can't show, in one line where you can and four at most. Don't restate names or signatures, narrate steps, record history, or explain the fix you just made; the PR carries that. `t3code/no-low-value-comments` enforces the length cap and the mechanical cases.
- React effects are for synchronizing with something outside React. Derive in render and act in handlers instead of syncing state, but don't hide real lifecycle work in refs or stores to dodge one. The `t3code/no-unreasoned-state-sync` lint rule reports every effect; one that stays states its reason with `// oxlint-disable-next-line t3code/no-unreasoned-state-sync -- <why>`.
- Our users drive agents all day and notice a dropped frame, a lying spinner, and a stale label. No continuously repainting animations; they peg the GPU on high-refresh displays.
- If a rule here fights the task in front of you, say so loudly and get a human sign-off before breaking it.

## Additional tips

- Security is important, but should not be over-indexed on, especially for dev mode/maintainer-only features.
