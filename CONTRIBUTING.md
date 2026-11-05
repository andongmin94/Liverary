# Contributing to Liverary

## Development setup

Follow [README.md](README.md#source) for installation, development commands, and desktop packaging requirements. Read [AGENTS.md](AGENTS.md) before changing code.

Liverary maintains its own Korean interface, branding, local data paths, and release workflows. Integrate upstream stable releases through the existing [maintenance procedure](.github/upstream-maintenance.md).

<a id="one-problem"></a>

## Scope

- Describe the observed problem and the intended behavior before implementing a substantial change.
- Keep a change focused on one underlying problem and include only the contracts, clients, server code, and tests it affects.
- Prefer the existing dependencies and services. Remove obsolete paths instead of adding compatibility layers or speculative recovery systems.
- Use this repository's [issues](https://github.com/andongmin94/Liverary/issues) for reports and proposals. Do not send Liverary-specific changes to the upstream project's review process.
- Keep `main` as the only branch unless the user explicitly requests another branch. Open a pull request only when requested.

## Verification

Use the focused checks in [AGENTS.md](AGENTS.md#verifying). Before a push, run `vp run check:changed`; the existing CI and release workflows provide integrated verification.

Explain what changed, why it was needed, the checks performed, and any concrete limitations. UI changes need before/after evidence; attach that evidence to the review rather than committing screenshots or recordings. Do not repeat passing checks without a related change or unresolved failure.

Keep setup and release guidance in the README. Do not add parallel plans, progress documents, or copies of upstream manuals.
