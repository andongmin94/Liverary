# Install Liverary

Liverary runs coding agents on your computer and provides a desktop app and a
local web interface. Install it on the machine where the agents will work.
You can connect your existing Codex or Claude subscription from provider settings.

## Desktop app

Download an installer from [Liverary Releases](https://github.com/andongmin94/Liverary/releases/latest).
The release workflow publishes these builds:

| Platform             | File                                 |
| -------------------- | ------------------------------------ |
| Windows x64          | `Liverary-<version>-x64.exe`         |
| Linux x64            | `Liverary-<version>-x86_64.AppImage` |
| Debian or Ubuntu x64 | `Liverary-<version>-amd64.deb`       |

On Debian or Ubuntu, install the downloaded file with
`sudo apt install ./Liverary-<version>-amd64.deb`.
The `.deb` updater asks for your password to install updates. If your desktop
has no password prompt, download and install the new `.deb` manually.

macOS and ARM installers are not published by this repository's current release
workflow. Use [source development](#source) on those platforms.

### The `t3` command

Liverary retains the `t3` executable name for compatibility with existing
commands and integrations. In the desktop app, open **Settings → About** and
choose **Install** next to **t3 command** to put the bundled CLI on your `PATH`.
Open a new terminal afterwards. **Remove** removes that entry again. The app
leaves an existing command owned by another installation in place.

Make sure the command you run belongs to your Liverary installation. The npm
package `t3`, upstream package-manager entries, and `t3.codes` installers install
the original project. Use the Liverary installers below for this fork.

### Windows Subsystem for Linux

Choose a WSL distro in **Settings → Sharing & access** to run agents and projects
there. Install provider CLIs inside that distro. Liverary installs its bundled
server runtime there; the first launch after an app update can take longer.

### Open a project from a terminal

With the desktop app already running on the same machine, run `t3 app` from a
project directory. Pass a path, such as `t3 app ../my-project`, to open another
directory. This requires the running desktop app on that machine.

## Command line

The standalone installers download CLI archives and verify their `SHA256SUMS`
from this repository's releases. Published CLI builds are Linux x64 and Windows
x64. No Node.js, npm, or compiler is needed.

On Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/andongmin94/Liverary/main/scripts/install.sh | sh
```

On Windows, in PowerShell:

```powershell
irm https://raw.githubusercontent.com/andongmin94/Liverary/main/scripts/install.ps1 | iex
```

The command is installed in `~/.local/bin`; the installer explains how to add
that directory to `PATH` if needed. The runtime and application data use
`~/.t3-custom`. Existing `T3CODE_HOME`, `T3CODE_INSTALL_BIN_DIR`, and
`T3CODE_VERSION` overrides remain supported. An exact version must have a CLI
archive for your platform in Liverary Releases. The default channel is stable.

| Task                                        | Command                                         |
| ------------------------------------------- | ----------------------------------------------- |
| Start the server and open the web app       | `t3`                                            |
| Start the server without a browser          | `t3 serve`                                      |
| Connect another device                      | `t3 pair` ([remote access](./remote-access.md)) |
| Keep a Linux host running in the background | `t3 service install`                            |
| Install the latest Liverary CLI release     | `t3 update`                                     |
| Inspect the data store                      | `t3 doctor`                                     |
| Remove the CLI installation                 | `t3 uninstall`                                  |

Run `t3 --help` for the full reference. Start in another directory with an
explicit path such as `t3 ./my-project`. If a server already owns the data
directory, connect to that server or use a separate `--base-dir`.

## Source

Install [Vite+](https://viteplus.dev/guide/), then use the Node.js and package
manager versions pinned by the repository:

```sh
git clone https://github.com/andongmin94/Liverary.git
cd Liverary
vp install --frozen-lockfile
vp run dev
```

Use `vp run dev:desktop` for desktop development. For build and maintenance
commands, see the [project README](../../README.md#소스에서-실행).

## Mobile app

This repository currently publishes desktop and CLI releases. The upstream
mobile clients and T3 Connect retain their own names, accounts, and distribution.
See [remote access](./remote-access.md) for supported connection methods.

## Providers

Open **Settings → Providers** in the web or desktop app, select the environment,
and enable the provider you want. Installation, login, and configuration belong
to that environment's machine, even when you connect from a phone or another
computer.

| Provider    | Install and authenticate                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex       | [Connect with ChatGPT](./providers-codex.md#connect-with-chatgpt), or install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`. |
| Claude      | Install [Claude Code](https://claude.com/product/claude-code), then run `claude auth login`.                                                              |
| Cursor      | Install [Cursor CLI](https://cursor.com/cli), then run `agent login`.                                                                                     |
| Grok Build  | Install [Grok Build CLI](https://x.ai/cli), then run `grok login`.                                                                                        |
| Kiro        | Install [Kiro CLI](https://kiro.dev/docs/cli/), then run `kiro-cli login`.                                                                                |
| OpenCode    | Install [OpenCode](https://opencode.ai), then run `opencode auth login`.                                                                                  |
| Antigravity | Install and sign in with Google from Liverary's provider settings.                                                                                        |
| Pi          | Install [Pi](./providers-pi.md#set-up-pi) with Node.js 22.19 or newer, then run `pi` and `/login`.                                                        |
| Muse Code   | Install [Muse Code](https://dev.meta.ai/docs/muse-code) on the server, run `muse login`, then enable it in Settings → Providers.                          |
| fx          | Install [fx](https://fx.sh) with `curl -fsSL https://fx.sh/setup.sh \| bash`, then run `fx login`.                                                        |

Provider CLIs must be on the server's `PATH`. If Liverary cannot find one, set its
**Binary path** in provider settings, especially when using a version manager.
Cursor's executable is `cursor-agent`, although its login command is
`agent login`. Codex connected through ChatGPT and Antigravity can use their
managed runtimes without a `PATH` entry.

Liverary warns when a provider version has known compatibility problems with your
release. Check **Settings → Providers** on that environment for the recommended
version or range. When its package manager supports installing a specific version,
you can install the recommendation there. Otherwise use the provider's installer
on the environment's machine. An unlisted version is unverified.

When a provider CLI is behind its latest release, its provider card shows the
available version. **Update now** runs the installer that owns the CLI
(Homebrew, or a global npm, pnpm, Yarn, Bun, Volta, or Vite+ install), or the
CLI's own update command when Liverary cannot tell. Update a CLI installed with
mise through mise. Cursor and Antigravity update with Liverary. Homebrew and
Chocolatey installs compare against the version their package manager offers,
which can trail the npm release; update Claude installed with Chocolatey
through Chocolatey.

Add another provider instance for a separate account or configuration. Each
instance can have its own environment variables, such as API keys or a custom
base URL. Mark secret values as sensitive; after saving, Liverary does not display
their original values.

For provider-specific setup and accounts, see [Codex](./providers-codex.md),
[Claude](./providers-claude.md), [OpenCode](./providers-opencode.md),
[Antigravity](./providers-antigravity.md), [Kiro](./providers-kiro.md),
[Pi](./providers-pi.md), [Muse Code](./providers-muse.md), and [fx](./providers-fx.md).

## Next steps

- [Working with threads](./thread-sidebar.md): start tasks and organize parallel work.
- [Permission modes](./permission-modes.md): choose when agents ask before acting.
- [Remote access](./remote-access.md): connect from another device.
- [Running in the background](./background-service.md): keep a Linux or macOS host available.
- [Updating Liverary](./updating.md): update the app and connected servers.
- [Managed policy](./managed-policy.md): configure Liverary for everyone on a machine.
