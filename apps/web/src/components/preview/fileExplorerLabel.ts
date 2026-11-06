import { workspaceText } from "~/locales/ko/workspace";
import type { ExecutionEnvironmentPlatformOs, FileManagerRevealKind } from "@t3tools/contracts";

export function revealInFileExplorerLabel(platform: string): string {
  const normalized = platform.toLowerCase();
  if (normalized.includes("mac")) return workspaceText["Reveal in Finder"];
  if (normalized.includes("win")) return workspaceText["Reveal in File Explorer"];
  return workspaceText["Reveal in Files"];
}

export function revealInFileExplorerLabelForOs(os: ExecutionEnvironmentPlatformOs): string {
  if (os === "darwin") return workspaceText["Reveal in Finder"];
  if (os === "windows") return workspaceText["Reveal in File Explorer"];
  return workspaceText["Reveal in Files"];
}

export function revealInFileExplorerLabelForKind(kind: FileManagerRevealKind): string {
  if (kind === "finder") return workspaceText["Reveal in Finder"];
  if (kind === "file-explorer") return workspaceText["Reveal in File Explorer"];
  return workspaceText["Reveal in Files"];
}
