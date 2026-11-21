import { msg } from "gt-react";
import { m } from "../../i18n/messages";

import type { ExecutionEnvironmentPlatformOs, FileManagerRevealKind } from "@t3tools/contracts";

export function revealInFileExplorerLabel(platform: string): string {
  const normalized = platform.toLowerCase();
  if (normalized.includes("mac")) return m(msg("Reveal in Finder"));
  if (normalized.includes("win")) return m(msg("Reveal in File Explorer"));
  return m(msg("Reveal in Files"));
}

export function revealInFileExplorerLabelForOs(os: ExecutionEnvironmentPlatformOs): string {
  if (os === "darwin") return m(msg("Reveal in Finder"));
  if (os === "windows") return m(msg("Reveal in File Explorer"));
  return m(msg("Reveal in Files"));
}

export function revealInFileExplorerLabelForKind(kind: FileManagerRevealKind): string {
  if (kind === "finder") return m(msg("Reveal in Finder"));
  if (kind === "file-explorer") return m(msg("Reveal in File Explorer"));
  return m(msg("Reveal in Files"));
}
