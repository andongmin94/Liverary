import type { TerminalAgentStatus } from "@t3tools/contracts";
import {
  appendTerminalOutput,
  EMPTY_TERMINAL_OUTPUT,
  type TerminalOutputState,
} from "@t3tools/shared/terminalOutput";

export interface TerminalAgentScreen {
  readonly output: TerminalOutputState;
  readonly alternateScreen: boolean;
}

export const EMPTY_TERMINAL_AGENT_SCREEN: TerminalAgentScreen = {
  output: EMPTY_TERMINAL_OUTPUT,
  alternateScreen: false,
};

export function appendTerminalAgentOutput(
  screen: TerminalAgentScreen,
  data: string,
): TerminalAgentScreen {
  const input = screen.output.pending + data;
  const switches = [...input.matchAll(/\u001b\[\?(?:47|1047|1049)([hl])/g)];
  const lastSwitch = switches.at(-1);
  if (lastSwitch) {
    // The shared fold does not restore alternate buffers; wait for a fresh primary screen.
    return {
      output: appendTerminalOutput(
        EMPTY_TERMINAL_OUTPUT,
        input.slice(lastSwitch.index + lastSwitch[0].length),
      ),
      alternateScreen: lastSwitch[1] === "h",
    };
  }
  return { ...screen, output: appendTerminalOutput(screen.output, data) };
}

export function estimateTerminalAgentState(
  provider: TerminalAgentStatus["provider"],
  screen: TerminalAgentScreen,
): TerminalAgentStatus["state"] {
  if (screen.alternateScreen || screen.output.pending.length > 0) return "unknown";
  const lines = screen.output.screen.lines
    .map((line) =>
      line
        .map((run) => run.text)
        .join("")
        .trim(),
    )
    .filter((line) => line.length > 0)
    .slice(-12);
  const tail = lines.slice(-3).join("\n").toLowerCase();
  if (tail.includes("showing detailed transcript") || tail.includes("q to quit")) return "unknown";

  const prompt = provider === "claude" ? /^❯(?:\s|$)(?!\s*\d+[.)])/ : /^›(?:\s|$)/;
  const promptIndex = lines.findLastIndex((line) => prompt.test(line));
  const footer = lines
    .slice(Math.max(promptIndex + 1, lines.length - 3))
    .join("\n")
    .toLowerCase();
  const lastLine = lines.at(-1)?.toLowerCase() ?? "";
  const cancelFooter = /esc to cancel|tab to amend|ctrl\+e to explain/.test(lastLine);
  if (
    (cancelFooter &&
      footer.includes("esc to cancel") &&
      /enter to (?:confirm|select)|tab to amend|ctrl\+e to explain/.test(footer)) ||
    (provider === "codex" && /enter to submit (?:answer|all)/.test(lastLine))
  ) {
    return "blocked";
  }
  if (cancelFooter) return "unknown";

  const rule = /^[─━-]{3,}$/;
  const activity = (promptIndex < 0 ? lines : lines.slice(0, promptIndex))
    .filter((line) => !rule.test(line))
    .at(-1);
  if (
    activity &&
    (provider === "claude"
      ? /^[*·✢✳✶✻✽⏸⏵]\s+.+(?:esc to interrupt|…\s+\(\d+[smh])/.test(activity)
      : /^[^›].+\((?:\d+[hm]\s+)*\d+s\s+[•·]\s+esc to interrupt\)/i.test(activity))
  ) {
    return "working";
  }

  if (
    promptIndex >= 0 &&
    (provider === "claude"
      ? rule.test(lines[promptIndex - 1] ?? "") && rule.test(lines[promptIndex + 1] ?? "")
      : footer.includes("? for shortcuts"))
  ) {
    return "idle";
  }
  return "unknown";
}
