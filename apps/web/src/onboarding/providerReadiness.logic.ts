import {
  ClaudeSettings,
  CodexSettings,
  type ExecutionEnvironmentPlatformOs,
  type ServerProvider,
  type ServerSettings,
} from "@t3tools/contracts";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const decodeClaudeSettings = Schema.decodeUnknownOption(ClaudeSettings);
const decodeCodexSettings = Schema.decodeUnknownOption(CodexSettings);
const SAFE_SHELL_BINARY_PATTERN = /^[A-Za-z0-9_./:\\-]+$/;

function quoteProviderBinary(
  binaryPath: string,
  fallback: string,
  platform: ExecutionEnvironmentPlatformOs,
): string {
  if (
    SAFE_SHELL_BINARY_PATTERN.test(binaryPath) &&
    (platform === "windows" || !binaryPath.includes("\\"))
  ) {
    return binaryPath;
  }
  if (platform === "windows") return `& '${binaryPath.replaceAll("'", "''")}'`;
  if (platform === "darwin" || platform === "linux") {
    if (binaryPath.startsWith("~/") || binaryPath.startsWith("~\\")) {
      return `~/'${binaryPath.slice(2).replaceAll("'", `'"'"'`)}'`;
    }
    return `'${binaryPath.replaceAll("'", `'"'"'`)}'`;
  }
  return fallback;
}

export function getOnboardingProviderState(provider: ServerProvider | undefined) {
  if (provider === undefined) return "checking";
  if (!provider.enabled || provider.status === "disabled") return "disabled";
  if (!provider.installed && provider.status === "warning" && provider.auth.status === "unknown")
    return "checking";
  if (!provider.installed) return "install";
  if (provider.auth.status === "unauthenticated") return "signIn";
  if (provider.status === "ready") return "ready";
  return "attention";
}

// These need no Node/npm and install where provider maintenance recognizes native binaries.
const NATIVE_INSTALL_COMMANDS = {
  claudeAgent: {
    windows: "irm https://claude.ai/install.ps1 | iex",
    posix: "curl -fsSL https://claude.ai/install.sh | bash",
  },
  codex: {
    windows: "irm https://chatgpt.com/codex/install.ps1 | iex",
    posix: "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
  },
} as const;

export type InstallableDriver = keyof typeof NATIVE_INSTALL_COMMANDS;

export function isInstallableDriver(driver: string): driver is InstallableDriver {
  return Object.hasOwn(NATIVE_INSTALL_COMMANDS, driver);
}

export function resolveOnboardingProviderInstallCommand(
  driver: InstallableDriver,
  platform: ExecutionEnvironmentPlatformOs,
): string {
  const commands = NATIVE_INSTALL_COMMANDS[driver];
  return platform === "windows" ? commands.windows : commands.posix;
}

export function resolveOnboardingProviderLoginCommand(
  provider: ServerProvider,
  settings: ServerSettings,
  platform: ExecutionEnvironmentPlatformOs,
): string {
  if (!isInstallableDriver(provider.driver)) return provider.driver;
  const claude = provider.driver === "claudeAgent";
  const command = claude ? "claude" : "codex";
  const decodeSettings = claude ? decodeClaudeSettings : decodeCodexSettings;
  const config: Option.Option<{ readonly binaryPath: string }> = decodeSettings(
    settings.providerInstances[provider.instanceId]?.config ?? {},
  );
  const configuredPath = Option.getOrUndefined(config)?.binaryPath ?? command;
  const binaryPath =
    configuredPath === command ? (provider.resolvedBinaryPath ?? configuredPath) : configuredPath;
  return `${quoteProviderBinary(binaryPath, command, platform)} ${claude ? "auth login" : "login"}`;
}
