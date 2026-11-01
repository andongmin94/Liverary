import type { DesktopBridge, DesktopUpdateState } from "@t3tools/contracts";

const DOWNLOAD_URL = "https://github.com/andongmin94/t3-custom/releases";
const ISSUE_URL = "https://github.com/andongmin94/t3-custom/issues/new";
const LAST_FAILURE_KEY = "t3code:boot-failed-at";
const REPEAT_FAILURE_MS = 5 * 60_000;
const MAX_CAUSES = 3;
const MAX_ERROR_CHARS = 6_000;
const COPY_BLOCKED = "복사가 차단되었습니다. 선택된 내용을 직접 복사해 주세요.";
const UPDATE_DOWNLOAD_FAILED = "업데이트 다운로드에 실패했습니다. 다운로드를 다시 시도해 주세요.";
const UPDATE_INSTALL_FAILED = "업데이트 설치에 실패했습니다. 다시 시작하여 업데이트해 주세요.";

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
    console.warn("Could not read the desktop CLI state.", error);
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
      return { kind: "install" } as const;
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
    details = `${details.slice(0, MAX_ERROR_CHARS)}\n[truncated]`;
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
      import.meta.env.VITE_RELEASE_CHANNEL || /-(nightly|preview)\./.exec(version)?.[1] || "stable",
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
    onBlocked(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘C를 눌러 복사" : "Ctrl+C를 눌러 복사");
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
    if (action?.kind === "download") button.textContent = "업데이트 다운로드";
    if (action?.kind === "downloading")
      button.textContent = `업데이트 다운로드 중 (${action.percent}%)`;
    if (action?.kind === "install") button.textContent = "다시 시작하여 업데이트";
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
        ? bridge.installUpdate()
        : action?.kind === "download"
          ? bridge.downloadUpdate()
          : undefined;
    run?.then(
      (result) => render(result.state),
      (error: unknown) => console.warn("Could not update Ondam.", error),
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
      (error: unknown) => console.warn("Could not read the desktop update state.", error),
    );
  } catch (error) {
    console.warn("Could not read the desktop update state.", error);
  }
}

export function showBootError(error: unknown) {
  console.error("Ondam failed to start.", error);
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
    element("h1", { textContent: "온담을 시작하지 못했습니다" }),
    element("p", {
      textContent: offline
        ? "브라우저가 오프라인 상태입니다. 연결을 확인한 후 새로고침해 주세요."
        : "먼저 화면을 새로고침해 주세요.",
    }),
  ]);
  message.setAttribute("role", "alert");

  const reload = element("button", {
    id: "boot-error-reload",
    type: "button",
    textContent: "새로고침",
  });
  reload.addEventListener("click", () => window.location.reload());
  const update = element("button", { id: "boot-error-update", type: "button", hidden: true });
  const updateNote = element("p", { id: "boot-error-update-note", hidden: true });
  if (bridge) mountUpdateButton(bridge, update, updateNote, announce);

  const command = element("code");
  const copyCommand = element("button", {
    className: "boot-error-icon",
    type: "button",
    title: "명령 복사",
    innerHTML: COPY_ICON,
  });
  copyCommand.setAttribute("aria-label", "명령 복사");
  copyCommand.addEventListener("click", () =>
    copyText(
      command,
      () => {
        copyCommand.innerHTML = CHECK_ICON;
        copyCommand.title = "복사 완료";
        copyCommand.setAttribute("aria-label", "복사 완료");
        announce("클립보드에 복사했습니다.");
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
    console.warn("Could not describe the startup error.", reportError);
  }
  const details = element("pre", { id: "boot-error-details", tabIndex: 0, textContent: report });
  const copyDetails = element("button", { type: "button", textContent: "오류 내용 복사" });
  copyDetails.addEventListener("click", () =>
    copyText(
      details,
      () => {
        copyDetails.textContent = "복사 완료";
        announce("클립보드에 복사했습니다.");
      },
      (hint) => {
        copyDetails.textContent = hint;
        announce(COPY_BLOCKED);
      },
    ),
  );

  const issue = new URL(ISSUE_URL);
  issue.searchParams.set("template", "bug_report.yml");
  issue.searchParams.set("title", "온담을 시작하지 못했습니다");
  issue.searchParams.set("area", "apps/web");
  issue.searchParams.set("version", `${environment.version} (${environment.channel})`);
  issue.searchParams.set("environment", `${environment.surface}, ${environment.platform}`);
  const link = (href: string, textContent: string) =>
    element("a", { href, textContent, target: "_blank", rel: "noreferrer" });

  const more = element("details", { open: isRepeatFailure(Date.now()) }, [
    element("summary", { textContent: "문제가 계속될 때" }),
    ...(bridge ? [link(DOWNLOAD_URL, "온담 다운로드 및 재설치")] : []),
    element("div", {}, [
      details,
      element("p", {
        textContent:
          "오류 내용에 로컬 파일 경로와 이름이 포함될 수 있습니다. 공유 전에 확인하세요.",
      }),
      element("div", { id: "boot-error-report" }, [
        copyDetails,
        link(issue.href, "GitHub에 버그 신고"),
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
          textContent:
            "온담이 실행되는 컴퓨터에서 이 명령을 실행하세요. 에이전트가 로컬 로그를 확인하고 버그 신고를 도와줄 수 있습니다.",
        }),
        element("div", { id: "boot-error-command" }, [command, copyCommand]),
      ]),
      more.lastChild,
    );
  });
}
