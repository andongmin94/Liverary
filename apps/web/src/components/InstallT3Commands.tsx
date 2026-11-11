import { onboardingKo } from "~/locales/ko/onboarding";
import { cn } from "~/lib/utils";

import { CommandBlock } from "./CommandBlock";

/**
 * Setup steps for another computer: install `liverary`, then run `command`. Both installers are shown
 * because the browser showing this is often not the computer being set up.
 */
export function InstallT3Commands({
  command,
  className,
}: {
  readonly command: string;
  readonly className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs text-muted-foreground">macOS, Linux</p>
      <CommandBlock command="curl -fsSL https://raw.githubusercontent.com/andongmin94/Liverary/main/scripts/install.sh | sh" />
      <p className="text-xs text-muted-foreground">Windows (PowerShell)</p>
      <CommandBlock command="irm https://raw.githubusercontent.com/andongmin94/Liverary/main/scripts/install.ps1 | iex" />
      <p className="text-xs text-muted-foreground">{onboardingKo["Then"]}</p>
      <CommandBlock command={command} />
      <p className="text-xs text-muted-foreground">{onboardingKo.cliInstallHint}</p>
    </div>
  );
}
