import { useState } from "react";
import type { EnvironmentId } from "@t3tools/contracts";
import { readPrimaryEnvironmentTarget } from "~/environments/primary/target";
import { chatKo } from "~/locales/ko/chat";
import { usePrimaryEnvironmentId } from "~/state/environments";
import { Button } from "../ui/button";
import { MessageCopyButton } from "./MessageCopyButton";

export function ClaudeDesktopResumeNotice({
  cwd,
  environmentId,
}: {
  cwd: string;
  environmentId: EnvironmentId;
}) {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const bridge = window.desktopBridge;
  const canOpenClaude =
    bridge &&
    environmentId === primaryEnvironmentId &&
    readPrimaryEnvironmentTarget()?.source === "desktop-managed";
  const [launchFailed, setLaunchFailed] = useState(false);

  return (
    <section
      aria-label={chatKo["Continue in Claude"]}
      className="my-2 grid gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm"
    >
      <h3 className="font-medium">{chatKo["Continue in Claude"]}</h3>
      <p className="text-muted-foreground">
        {
          chatKo[
            "In Claude Desktop’s local Code prompt on the computer running this conversation, enter "
          ]
        }
        <code className="select-all font-mono">/resume</code>
        {
          chatKo[
            " and select this conversation under the folder below. If Claude asks about trust, check the folder."
          ]
        }
      </p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 select-all whitespace-pre-wrap break-all font-mono">{cwd}</code>
        <MessageCopyButton
          text={cwd}
          label={chatKo["Copy folder path"]}
          size="icon-xs"
          variant="ghost"
        />
      </div>
      {canOpenClaude && (
        <div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={async () => {
              const opened = await bridge.openExternal("claude://code/new").catch(() => false);
              setLaunchFailed(!opened);
            }}
          >
            {chatKo["Open Claude Desktop"]}
          </Button>
        </div>
      )}
      {launchFailed && <p role="alert">{chatKo["Open Claude Desktop manually to continue."]}</p>}
    </section>
  );
}
