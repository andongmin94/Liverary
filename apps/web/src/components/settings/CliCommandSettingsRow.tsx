import { useGT, msg } from "gt-react";
import { m } from "../../i18n/messages";

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
  install: m(msg("Could not install liverary")),
  uninstall: m(msg("Could not remove liverary")),
  addToPath: m(msg("Could not add liverary to PATH")),
} as const;

/** The desktop `liverary` command's state, and its actions with a toast on failure. */
export function useDesktopCliCommand() {
  const gt = useGT();
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
              error instanceof Error
                ? error.message
                : gt("Something went wrong.", { $context: "settingsText: Something went wrong." }),
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
  const gt = useGT();
  const { state, busy, run } = useDesktopCliCommand();

  if (!state?.supported) return null;
  const installed = state.installedPath !== null;
  const description = state.shadowedBy
    ? gt("Another liverary at {path} runs first in a new terminal. Remove it to use Liverary's.", {
        path: String(state.shadowedBy),
      })
    : !installed
      ? gt("Run Liverary's CLI as `liverary` from any terminal.")
      : state.onPath
        ? gt("Installed at {path}. Open a new terminal to use it.", {
            path: String(state.installedPath),
          })
        : state.pathSetup?.added
          ? gt("Installed at {path} and added to PATH in {file}. Open a new terminal to use it.", {
              path: String(state.installedPath),
              file: String(state.pathSetup.file),
            })
          : state.pathSetup
            ? gt("Installed at {path}, which is not on your PATH yet.", {
                path: String(state.installedPath),
              })
            : gt(
                "Installed at {path}, which is not on your PATH yet. Add its folder to your PATH to run `liverary`.",
                {
                  path: String(state.installedPath),
                },
              );

  return (
    <SettingsRow
      {...searchableSetting("cli-command")}
      description={description}
      control={
        <div className="flex gap-2">
          {state.pathSetup && !state.pathSetup.added ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run("addToPath")}>
              {gt("Add to PATH")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={busy || (!installed && Boolean(state.shadowedBy))}
            onClick={() => run(installed ? "uninstall" : "install")}
          >
            {installed ? gt("Remove") : gt("Install")}
          </Button>
        </div>
      }
    />
  );
}
