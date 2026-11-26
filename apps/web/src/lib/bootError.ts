import { msg } from "gt-react";
import { m } from "../i18n/messages";

import type { DesktopBridge, DesktopUpdateState } from "@t3tools/contracts";

const DOWNLOAD_URL = "https://github.com/andongmin94/Liverary/releases";
const ISSUE_URL = "https://github.com/andongmin94/Liverary/issues/new";
const LAST_FAILURE_KEY = "t3code:boot-failed-at";
const REPEAT_FAILURE_MS = 5 * 60_000;
const MAX_CAUSES = 3;
const MAX_ERROR_CHARS = 6_000;
const COPY_BLOCKED = m(msg("Copying was blocked. Copy the selected content manually."));
const UPDATE_DOWNLOAD_FAILED = m(msg("Could not download the update. Try downloading it again."));
const UPDATE_INSTALL_FAILED = m(msg("Could not install the update. Restart to update."));

/** The Windows launcher is a `.cmd` run from PowerShell, which needs `&` to run a quoted path. */
function launcherCommand(launcherPath: string) {
  if (launcherPath.endsWith(".cmd")) {
    return /^[\w:\\.-]+$/.test(launcherPath)
      ? launcherPath
      : `& '${launcherPath.replace(/['\u2018\u2019\u201A\u201B]/g, "$&$&")}'`;
  }
  return /^[\w@%+=:,./-]+$/.test(launcherPath)
    ? launcherPath
    : `'${launcherPath.replaceAll("'", `'"'"'`)}'`;
}

/** Use the bundled launcher so a different `t3` on PATH is never selected. */
export async function resolveTriageCommand(bridge: DesktopBridge | undefined) {
  try {
    const state = await bridge?.cliCommand.getState();
    // Windows reports onPath from its PATH entry alone; only an existing launcher proves it runs.
    if (state?.launcherPath) {
      return `${launcherCommand(state.launcherPath)} triage`;
    }
  } catch (error) {
    console.warn(m(msg("Could not read the desktop CLI state.")), error);
  }
  return null;
}

/** The update button only appears when the desktop updater has a newer build to offer. */
export function updateActionFor(state: DesktopUpdateState | null | undefined) {
  switch (state?.status) {
    case "available":
      return { kind: "download" } as const;
    case "downloading":
      return { kind: "downloading", percent: Math.round(state.downloadPercent ?? 0) } as const;
    case "downloaded":
      return state.downloadedVersion
        ? ({ kind: "install", version: state.downloadedVersion } as const)
        : null;
    default:
      return null;
  }
}

function safeString(value: unknown) {
  try {
    return String(value);
  } catch {
    return "";
  }
}

function describeOne(value: unknown) {
  if (value instanceof Error) {
    const header = value.message ? `${value.name}: ${value.message}` : value.name;
    // V8 stacks start with the header; Safari and Firefox stacks do not.
    const stack = typeof value.stack === "string" ? value.stack : "";
    return stack === header || stack.startsWith(`${header}\n`)
      ? stack
      : [header, stack].filter(Boolean).join("\n");
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? safeString(value);
  } catch {
    return safeString(value);
  }
}

/** Hosts can name private machines, and pairing tokens live in query strings and hashes. */
function redact(text: string) {
  return text
    .replace(/\b[a-z][\w+.-]*:\/\/[^\s/?#'"()]+/gi, "")
    .replace(/[?#][^\s'"()]*=[^\s'"()]*?((?::\d+){1,2})?(?=[\s'"()]|$)/g, "$1");
}

export interface BootErrorEnvironment {
  readonly version: string;
  readonly channel: string;
  readonly surface: "desktop" | "web";
  readonly platform: string;
  readonly userAgent: string;
  readonly time: string;
}

/** Plain text that is shown and copied as-is, so users see exactly what they share. */
export function buildErrorReport(error: unknown, environment: BootErrorEnvironment) {
  const parts: Array<string> = [];
  const seen = new Set<unknown>();
  let current = error;
  while (current != null && !seen.has(current) && parts.length <= MAX_CAUSES) {
    seen.add(current);
    const text = describeOne(current);
    parts.push(parts.length === 0 ? text : `Caused by: ${text}`);
    current = current instanceof Error ? current.cause : undefined;
  }
  let details = redact(parts.join("\n") || "(no error message)");
  if (details.length > MAX_ERROR_CHARS) {
    let end = MAX_ERROR_CHARS;
    const last = details.charCodeAt(end - 1);
    if (last >= 0xd800 && last <= 0xdbff) end -= 1;
    details = `${details.slice(0, end)}\n[truncated]`;
  }
  return [
    details,
    "",
    `Version: ${environment.version}`,
    `Channel: ${environment.channel}`,
    `Surface: ${environment.surface}`,
    `Platform: ${environment.platform}`,
    `User agent: ${environment.userAgent}`,
    `Time: ${environment.time}`,
  ].join("\n");
}

function clientPlatform(bridge: DesktopBridge | undefined) {
  try {
    return bridge?.getClientPlatform() ?? navigator.platform;
  } catch {
    return navigator.platform;
  }
}

function readEnvironment(bridge: DesktopBridge | undefined): BootErrorEnvironment {
  const version = import.meta.env.APP_VERSION;
  return {
    version,
    channel:
      import.meta.env.DEV || import.meta.env.VITE_RELEASE_CHANNEL === "dev" ? "dev" : "stable",
    surface: bridge ? "desktop" : "web",
    platform: clientPlatform(bridge),
    userAgent: navigator.userAgent,
    time: new Date().toISOString(),
  };
}

/** Opens More options by default when startup already failed in this tab a moment ago. */
function isRepeatFailure(now: number) {
  try {
    const previous = Number(sessionStorage.getItem(LAST_FAILURE_KEY));
    sessionStorage.setItem(LAST_FAILURE_KEY, String(now));
    return now - previous < REPEAT_FAILURE_MS;
  } catch {
    return false;
  }
}

const icon = (paths: string) =>
  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const COPY_ICON = icon(
  '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
);
const CHECK_ICON = icon('<path d="M20 6 9 17l-5-5"/>');

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: ReadonlyArray<Node | string> = [],
) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function selectContents(target: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(target);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function copySelection() {
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

/** Plain http has no Clipboard API, but the legacy copy command still works on a selection. */
function copyText(target: HTMLElement, onCopied: () => void, onBlocked: (hint: string) => void) {
  const fallback = () => {
    selectContents(target);
    if (copySelection()) return onCopied();
    onBlocked(
      /Mac|iPhone|iPad/.test(navigator.platform)
        ? m(msg("Press ⌘C to copy"))
        : m(msg("Press Ctrl+C to copy")),
    );
  };
  const clipboard = window.isSecureContext ? navigator.clipboard : undefined;
  if (typeof clipboard?.writeText !== "function") return fallback();
  clipboard.writeText(target.textContent ?? "").then(onCopied, fallback);
}

function mountUpdateButton(
  bridge: DesktopBridge,
  button: HTMLButtonElement,
  note: HTMLParagraphElement,
  announce: (text: string) => void,
) {
  let action: ReturnType<typeof updateActionFor> = null;
  const render = (state: DesktopUpdateState) => {
    action = updateActionFor(state);
    button.hidden = action === null;
    // aria-disabled keeps keyboard focus on the button while the download runs.
    button.setAttribute("aria-disabled", String(action?.kind === "downloading"));
    if (action?.kind === "download") button.textContent = m(msg("Download update"));
    if (action?.kind === "downloading")
      button.textContent = m(
        msg("Downloading update ({value0}%)", { value0: String(action.percent) }),
      );
    if (action?.kind === "install") button.textContent = m(msg("Restart to update"));
    const failure = !action
      ? ""
      : state.errorContext === "download"
        ? UPDATE_DOWNLOAD_FAILED
        : state.errorContext === "install"
          ? UPDATE_INSTALL_FAILED
          : "";
    if (failure === note.textContent) return;
    note.textContent = failure;
    note.hidden = !failure;
    if (failure) announce(failure);
  };
  button.addEventListener("click", () => {
    const run =
      action?.kind === "install"
        ? bridge.installUpdate(action.version)
        : action?.kind === "download"
          ? bridge.downloadUpdate()
          : undefined;
    run?.then(
      (result) => render(result.state),
      (error: unknown) => console.warn(m(msg("Could not update Liverary.")), error),
    );
  });
  // A pushed state is newer than the initial read, so the read must not overwrite it.
  let pushed = false;
  try {
    bridge.onUpdateState((state) => {
      pushed = true;
      render(state);
    });
    bridge.getUpdateState().then(
      (state) => pushed || render(state),
      (error: unknown) => console.warn(m(msg("Could not read the desktop update state.")), error),
    );
  } catch (error) {
    console.warn(m(msg("Could not read the desktop update state.")), error);
  }
}

export function showBootError(error: unknown) {
  console.error(m(msg("Liverary failed to start.")), error);
  const bootShell = document.getElementById("boot-shell");
  if (!bootShell) return;

  const bridge = window.desktopBridge;
  const environment = readEnvironment(bridge);
  const offline = !bridge && navigator.onLine === false;

  const status = element("span", { className: "boot-error-sr" });
  status.setAttribute("aria-live", "polite");
  // Clearing first makes screen readers announce a repeated message.
  let announcement: ReturnType<typeof setTimeout> | undefined;
  const announce = (text: string) => {
    clearTimeout(announcement);
    status.textContent = "";
    announcement = setTimeout(() => (status.textContent = text), 100);
  };

  const message = element("div", {}, [
    element("h1", { textContent: m(msg("Liverary could not start")) }),
    element("p", {
      textContent: offline
        ? m(msg("Your browser is offline. Check your connection, then reload."))
        : m(msg("Try reloading first.")),
    }),
  ]);
  message.setAttribute("role", "alert");

  const reload = element("button", {
    id: "boot-error-reload",
    type: "button",
    textContent: m(msg("Reload")),
  });
  reload.addEventListener("click", () => window.location.reload());
  const update = element("button", { id: "boot-error-update", type: "button", hidden: true });
  const updateNote = element("p", { id: "boot-error-update-note", hidden: true });
  if (bridge) mountUpdateButton(bridge, update, updateNote, announce);

  const command = element("code");
  const copyCommand = element("button", {
    className: "boot-error-icon",
    type: "button",
    title: m(msg("Copy command", { $context: "bootError.ts" })),
    innerHTML: COPY_ICON,
  });
  copyCommand.setAttribute("aria-label", m(msg("Copy command", { $context: "bootError.ts" })));
  copyCommand.addEventListener("click", () =>
    copyText(
      command,
      () => {
        copyCommand.innerHTML = CHECK_ICON;
        copyCommand.title = m(msg("Copied", { $context: "bootError.ts" }));
        copyCommand.setAttribute("aria-label", m(msg("Copied", { $context: "bootError.ts" })));
        announce(m(msg("Copied to clipboard.")));
      },
      (hint) => {
        copyCommand.textContent = hint;
        copyCommand.title = hint;
        copyCommand.setAttribute("aria-label", hint);
        announce(COPY_BLOCKED);
      },
    ),
  );

  let report = "(no error message)";
  try {
    report = buildErrorReport(error, environment);
  } catch (reportError) {
    console.warn(m(msg("Could not describe the startup error.")), reportError);
  }
  const details = element("pre", { id: "boot-error-details", tabIndex: 0, textContent: report });
  const copyDetails = element("button", {
    type: "button",
    textContent: m(msg("Copy error details")),
  });
  copyDetails.addEventListener("click", () =>
    copyText(
      details,
      () => {
        copyDetails.textContent = m(msg("Copied", { $context: "bootError.ts" }));
        announce(m(msg("Copied to clipboard.")));
      },
      (hint) => {
        copyDetails.textContent = hint;
        announce(COPY_BLOCKED);
      },
    ),
  );

  const issue = new URL(ISSUE_URL);
  issue.searchParams.set("template", "bug_report.yml");
  issue.searchParams.set("title", m(msg("Liverary could not start")));
  issue.searchParams.set("area", "apps/web");
  issue.searchParams.set("version", `${environment.version} (${environment.channel})`);
  issue.searchParams.set("environment", `${environment.surface}, ${environment.platform}`);
  const link = (href: string, textContent: string) =>
    element("a", { href, textContent, target: "_blank", rel: "noreferrer" });

  const more = element("details", { open: isRepeatFailure(Date.now()) }, [
    element("summary", { textContent: m(msg("If the problem continues")) }),
    ...(bridge ? [link(DOWNLOAD_URL, m(msg("Download and reinstall Liverary")))] : []),
    element("div", {}, [
      details,
      element("p", {
        textContent: m(
          msg("Error details may include local file paths and names. Review them before sharing."),
        ),
      }),
      element("div", { id: "boot-error-report" }, [
        copyDetails,
        link(issue.href, m(msg("Report a bug on GitHub"))),
      ]),
    ]),
  ]);

  bootShell.replaceChildren(
    element("div", { id: "boot-error" }, [
      message,
      element("div", { id: "boot-error-actions" }, [reload, update]),
      updateNote,
      more,
      status,
    ]),
  );

  void resolveTriageCommand(bridge).then((value) => {
    if (value === null) return;
    command.textContent = value;
    more.insertBefore(
      element("div", {}, [
        element("p", {
          textContent: m(
            msg(
              "Run this command on the computer running Liverary. An agent can inspect local logs and help report the bug.",
            ),
          ),
        }),
        element("div", { id: "boot-error-command" }, [command, copyCommand]),
      ]),
      more.lastChild,
    );
  });
}
