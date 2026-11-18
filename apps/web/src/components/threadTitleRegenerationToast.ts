import { sidebarKo } from "~/locales/ko/sidebar";
import type { ThreadTitleRegenerationOutcome } from "@t3tools/contracts";
import {
  type AtomCommandResult,
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";

import { stackedThreadToast } from "./ui/toast";

type TitleRegenerationResult = AtomCommandResult<ThreadTitleRegenerationOutcome | null, unknown>;

function failureMessage(result: TitleRegenerationResult): string | null {
  if (result._tag === "Failure") {
    if (isAtomCommandInterrupted(result)) return null;
    const error = squashAtomCommandFailure(result);
    return error instanceof Error ? error.message : sidebarKo.errorOccurred;
  }
  return result.value?.status === "failed"
    ? (result.value.message ?? sidebarKo.titleGenerationFailed)
    : null;
}

function isKept(result: TitleRegenerationResult): boolean {
  return result._tag === "Success" && result.value?.status === "unchanged";
}

export function titleRegenerationToast(results: ReadonlyArray<TitleRegenerationResult>) {
  const failures = results.flatMap((result) => {
    const message = failureMessage(result);
    return message === null ? [] : [message];
  });
  if (failures.length > 0) {
    return stackedThreadToast({
      type: "error",
      title:
        results.length === 1
          ? sidebarKo.regenerateTitleFailed
          : sidebarKo.regenerateSomeTitlesFailed(failures.length, results.length),
      description: failures[0],
    });
  }
  const kept = results.filter(isKept).length;
  if (kept === 0) return null;
  if (results.length === 1) {
    return stackedThreadToast({
      type: "info",
      title: sidebarKo.titleKept,
      description: sidebarKo.titleKeptDescription,
    });
  }
  return stackedThreadToast({
    type: "info",
    title:
      kept === results.length
        ? sidebarKo.titlesKept
        : sidebarKo.someTitlesKept(kept, results.length),
    description:
      kept === results.length
        ? sidebarKo.titlesKeptDescription
        : sidebarKo.someTitlesKeptDescription,
  });
}
