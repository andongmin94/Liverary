import { settingsMessages, settingsText } from "~/locales/ko/settings";
import { useState } from "react";

import {
  desktopCliCommandStateAtom,
  getDesktopCliCommandBridge,
  refreshDesktopCliCommandState,
} from "~/state/desktopCliCommand";
import { useEnvironmentQuery } from "~/state/query";
import { Button } from "../ui/button";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { SettingsRow } from "./settingsLayout";
import { searchableSetting } from "./settingsSearch";

const FAILURE_TITLES = {
  install: settingsText["Could not install liverary"],
  uninstall: settingsText["Could not remove liverary"],
  addToPath: settingsText["Could not add liverary to PATH"],
} as const;

/** The desktop `liverary` command's state, and its actions with a toast on failure. */
export function useDesktopCliCommand() {
  const bridge = getDesktopCliCommandBridge();
  const query = useEnvironmentQuery(bridge ? desktopCliCommandStateAtom : null);
  const [pending, setPending] = useState(false);

  const run = (action: keyof typeof FAILURE_TITLES) => {
    if (!bridge || pending) return;
    setPending(true);
    void bridge[action]()
      .then(refreshDesktopCliCommandState)
      .catch((error: unknown) => {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: FAILURE_TITLES[action],
            description:
              error instanceof Error ? error.message : settingsText["Something went wrong."],
          }),
        );
      })
      .finally(() => setPending(false));
  };

  return {
    state: bridge ? query.data : undefined,
    busy: pending || query.isPending,
    run,
  };
}

export function CliCommandSettingsRow() {
  const { state, busy, run } = useDesktopCliCommand();

  if (!state?.supported) return null;
  const installed = state.installedPath !== null;
  const description = state.shadowedBy
    ? settingsMessages.cliShadowed(state.shadowedBy)
    : !installed
      ? settingsText["Run T3 Code's CLI as `t3` from any terminal."]
      : state.onPath
        ? settingsMessages.cliInstalled(state.installedPath)
        : state.pathSetup?.added
          ? settingsMessages.cliAddedToPath(state.installedPath, state.pathSetup.file)
          : settingsMessages.cliPathSetupNeeded(state.installedPath, Boolean(state.pathSetup));

  return (
    <SettingsRow
      {...searchableSetting("cli-command")}
      description={description}
      control={
        <div className="flex gap-2">
          {state.pathSetup && !state.pathSetup.added ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run("addToPath")}>
              {settingsText["Add to PATH"]}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={busy || (!installed && Boolean(state.shadowedBy))}
            onClick={() => run(installed ? "uninstall" : "install")}
          >
            {installed ? settingsText["Remove"] : settingsText["Install"]}
          </Button>
        </div>
      }
    />
  );
}
