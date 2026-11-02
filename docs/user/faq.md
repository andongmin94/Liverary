# FAQ

## Is Liverary a harness?

No. A harness is what turns an LLM into an agent: it gives the model tools, a way to call them, runs them, and hands the results back. Claude Code is kind of a harness. It is an interface (the TUI, the Code tab in the desktop app) plus a harness underneath (the Anthropic Agent SDK). Codex is the same split: the app plus the Codex App Server. Liverary uses those harnesses. It is not a harness, and it does not work without one.

Chef = LLM. Kitchen = harness. Liverary = the restaurant that lets you bring whatever kitchen you want. Its MCP is a cookbook for the kitchen. The upstream T3 Code maintainer explains the analogy in [What is a harness?](https://t3.gg/blog/post/what-is-a-harness).

Bring your own: Claude Code, Codex, Cursor, Grok Build, OpenCode, Google Antigravity, Pi, or Muse Code. [Provider setup](./install.md#providers)

## Why use Liverary instead of Claude Code or the Codex app?

Liverary builds on T3 Code's approach to working with coding agents. What you get:

- Bring your own sub. Claude, Codex, and whatever else you already have installed.
- Remote access. [Install Liverary's CLI](./install.md#command-line), run `t3 up` on the host, and connect from another device.
- Compatible mobile clients.
- Truly 100% open source. If we go the wrong direction, fork it.

Every harness feels nearly identical in here, so you can stop worrying about harnesses and focus on building :) [Install](./install.md)

## Can I use Liverary with my Claude Code subscription?

Yes.

## How much does Liverary cost?

Liverary is free and open source (MIT). You bring your own subscription and still pay your provider. T3 Connect and T3 Chat are separate upstream services; their account limits are described under [More machines](#can-i-connect-more-than-3-machines-with-t3-connect). You can also use local network pairing or Tailscale. [Install](./install.md)

## Can I connect more than 3 machines with T3 Connect?

Yes. Link your T3 Chat account and T3 Connect raises your limit: up to 10 machines with T3 Chat Pro, or 100 with Premier. Open your account menu in Liverary, go to **T3 Chat**, and select **Link T3 Chat**. Sign in to T3 Chat and approve. The free T3 Chat plan keeps the normal limit of 3. [More machines with T3 Chat](./remote-access.md#more-machines-with-t3-chat)

## Why is my Claude 5-hour limit draining so fast?

Liverary drives Claude through Anthropic's Agent SDK. The upstream T3 Code maintainer reported faster consumption of Claude's 5-hour limits through the SDK, without the same effect on weekly limits. See the [upstream report](https://x.com/theo/status/2114166439813017873).

## How do I use Liverary remotely?

Your agents run wherever Liverary runs: your desktop, a server, a VPS. [Install Liverary's CLI](./install.md#command-line), then run `t3 up` on that machine. T3 Connect, LAN pairing, and Tailscale provide remote access. The upstream hosted web client is [app.t3.codes](https://app.t3.codes). [Remote access](./remote-access.md)

## How do I use Liverary on my phone?

The official T3 Code [iOS](https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824) and [Android](https://play.google.com/store/apps/details?id=com.t3tools.t3code) apps are upstream clients. Connect a compatible client to your computer with T3 Connect or a pairing link. The phone is a remote; your computer does the work and needs to stay on. [Mobile setup](./install.md#mobile-app) · [Remote access](./remote-access.md)

## Why does T3 Connect keep disconnecting?

T3 Connect is an upstream service integrated into Liverary for remote connections. If it keeps dropping, open **Settings > Environments**, find the machine, and select **Details**. The first part marked as failed is the cause. Tailscale is another available connection route. [T3 Connect troubleshooting](./t3-connect-troubleshooting.md)

## Will I get banned for using my subscription?

The upstream T3 Code maintainers describe their provider integrations and collaboration with [SpaceXAI](https://x.com/SpaceXSI/status/2070195830192320600) on Grok Build and Cursor. Those statements describe the upstream project; Liverary uses the inherited integrations and each provider's subscription terms still apply. See the [provider setup guides](./install.md#providers).

## Can I add a bunch of accounts for one provider?

Liverary supports separate provider instances, rather than automatically rotating a pool of accounts.

A separate work account is supported. Setup for two: [Codex](./providers-codex.md#use-multiple-accounts) · [Claude](./providers-claude.md#separate-accounts-or-configurations). For a bigger pool, manage it outside Liverary with a self-hosted proxy like [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI). The upstream T3 Code maintainer describes a setup in [this video](https://www.youtube.com/watch?v=D8PikZ1KhUo) and [this guide](https://gist.github.com/t3dotgg/59a521d2ee8d70aaf90e280c175072af). After you set up a hub, Liverary can show its pooled limits under Usage. [Connect a hub](./usage.md#connect-a-cliproxyapi-hub)

## Can I use an API key or OpenRouter instead of a subscription?

Yes. Add another provider instance in Settings and give it its own keys and endpoint. Claude has a full OpenRouter recipe. Your subscription setup stays untouched. [OpenRouter](./providers-claude.md#openrouter) · [Provider instances](./install.md#providers)

## Does Liverary support local models?

No. Liverary is a serious developer tool. Locally runnable models are not capable of meaningful engineering work.

## Does my code go to T3 servers?

Your code and prompts go from your machine to your provider (Anthropic, OpenAI, etc.). With T3 Connect, traffic rides a Cloudflare tunnel (`cloudflared` on your machine). The upstream relay sets up the link; it does not proxy your HTTP or WebSocket sessions. Liverary sends basic product usage events to the upstream endpoint (provider, model, token totals, that kind of thing), without prompts or file contents. That is the same on Tailscale, LAN, or T3 Connect. Set `T3CODE_TELEMETRY_ENABLED=false` if you want it off. [Product usage data](./telemetry.md)

## Worktrees are eating my disk. How do I clean them up?

Open **Settings > Storage** and turn on automatic worktree cleanup. You can also run it now from there. Worktrees add up fast. One user cleared 500 GB. [Storage cleanup](./project-settings.md#storage-cleanup)

## Is there voice input?

On iPhone, yes. You need iOS 26 or later. Tap the mic in the composer, talk, check the text, then send. Web, desktop, and Android do not have it yet. [Voice input on iPhone](./composer.md#voice-input-on-iphone)

## Does it work on Windows, Mac, and Linux?

Yes, all three. Desktop app, CLI, the works. One catch: there is no `t3` binary for Intel Macs, so use the desktop app there. Windows folks can also run agents inside WSL. [Install](./install.md)

## Why is my provider not showing up?

Almost always, the CLI is not installed or not on the `PATH` of the machine that runs the server. (Not your phone. The computer.) Log in on that machine first, like `codex login` or `claude auth login`. Still missing? Point **Binary path** at it in provider settings. Version managers love to cause this one. [Provider setup](./install.md#providers)
