import { applicationMessages, applicationText } from "~/locales/ko/application";
import { readLocalApi } from "~/localApi";

let pendingConfirmations = 0;

export function isTerminalCloseConfirmPending(): boolean {
  return pendingConfirmations > 0;
}

export async function confirmTerminalClose(
  labels: readonly [string, ...string[]],
): Promise<boolean> {
  const localApi = readLocalApi();
  if (!localApi) return true;
  pendingConfirmations += 1;
  try {
    return await localApi.dialogs.confirm(
      labels.length === 1
        ? [
            applicationMessages.closeTerminal(labels[0]),
            applicationText["This stops the running process and clears its history."],
          ].join("\n")
        : [
            applicationMessages.closeTerminals(labels.length),
            applicationMessages.closeTerminalsDescription(
              labels.map((label) => `"${label}"`).join(", "),
            ),
          ].join("\n"),
      { variant: "destructive" },
    );
  } catch {
    return false;
  } finally {
    pendingConfirmations -= 1;
  }
}
