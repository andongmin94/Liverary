import { msg } from "gt-react";
import { m } from "../../i18n/messages";
import type { TerminalAgentStatus } from "@t3tools/contracts";
export const terminalAgentStates: Record<TerminalAgentStatus["state"], string> = {
  working: m(msg("Working")),
  blocked: m(msg("Blocked")),
  idle: m(msg("Idle", { $context: "sidebarCopy.ts" })),
  unknown: m(msg("Unknown", { $context: "sidebarCopy.ts" })),
};
