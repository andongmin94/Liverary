import { workspaceMessages, workspaceText } from "~/locales/ko/workspace";
import type { ReactNode } from "react";
import type { DeviceToolVersions as ToolVersions } from "@t3tools/contracts";
import { InlineButton } from "~/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "~/components/ui/popover";

export function DeviceToolVersions({
  tools,
  action,
  kind,
  owner,
  error,
}: {
  tools: ToolVersions | undefined;
  action?: ReactNode;
  kind?: keyof ToolVersions;
  owner?: string | undefined;
  error?: string | undefined;
}) {
  const selected = kind ? tools?.[kind] : undefined;
  const version =
    selected?.runningVersion ??
    (selected?.installedVersions.includes(selected.requiredVersion)
      ? selected.requiredVersion
      : selected?.installedVersions
          .toSorted((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          .at(-1));
  const label = kind === "hub" ? workspaceText["Device hub"] : workspaceText["Agent device"];
  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          kind
            ? workspaceMessages["{0}: {1}. Show details"](
                label,
                version
                  ? workspaceMessages["version {0}"](version)
                  : selected
                    ? workspaceText["not installed"]
                    : workspaceText["version unknown"],
              )
            : undefined
        }
        render={<InlineButton tone="muted" />}
      >
        {kind
          ? version
            ? `v${version}`
            : selected
              ? workspaceText["Not installed"]
              : workspaceText["Version unknown"]
          : error
            ? workspaceText["Versions unavailable"]
            : workspaceText["Versions"]}
      </PopoverTrigger>
      <PopoverPopup align="end" width="md">
        <PopoverTitle>{kind ? label : workspaceText["Device tools"]}</PopoverTitle>
        {tools ? (
          <div className="mt-4 divide-y divide-border/50">
            {(
              [
                [workspaceText["Device hub"], tools.hub],
                [workspaceText["Agent device"], tools.agent],
              ] as const
            )
              .filter(([name]) => !kind || name === label)
              .map(([name, tool]) => (
                <div key={name} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  {!kind ? <p className="text-xs font-medium">{name}</p> : null}
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">{workspaceText["Running"]}</dt>
                    <dd className="text-right font-mono">
                      {tool.runningVersion ?? workspaceText["Not running"]}
                    </dd>
                    <dt className="text-muted-foreground">{workspaceText["Required"]}</dt>
                    <dd className="text-right font-mono">{tool.requiredVersion}</dd>
                    <dt className="text-muted-foreground">{workspaceText["Installed"]}</dt>
                    <dd className="text-right font-mono break-words">
                      {tool.installedVersions.join(", ") || workspaceText["None"]}
                    </dd>
                  </dl>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {workspaceText["Versions have not been checked."]}
          </p>
        )}
        <p className="mt-4 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          {owner ? workspaceMessages["Managed by {0}. "](owner) : ""}
          {workspaceText["Tools update automatically on this host when needed."]}
        </p>
        {error ? (
          <p role="status" className="mt-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </PopoverPopup>
    </Popover>
  );
}
