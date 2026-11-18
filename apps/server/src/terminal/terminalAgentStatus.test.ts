import { describe, expect, it } from "vite-plus/test";
import {
  appendTerminalAgentOutput,
  EMPTY_TERMINAL_AGENT_SCREEN,
  estimateTerminalAgentState,
} from "./terminalAgentStatus.ts";

const claudePrompt = "────────\r\n❯ \r\n────────\r\n  ? for shortcuts";
const codexPrompt = "› \r\n  ? for shortcuts";

describe("terminal agent screen estimates", () => {
  it.each([
    ["claude", "✻ Working… (12s · esc to interrupt)\r\n", "working"],
    ["claude", `✻ Working… (12s · esc to interrupt)\r\n${claudePrompt}`, "working"],
    [
      "claude",
      "Do you want to proceed?\r\n❯ 1. Yes\r\n2. No\r\nEsc to cancel · Tab to amend",
      "blocked",
    ],
    [
      "claude",
      "Select an option\r\nEnter to select · arrows to navigate · Esc to cancel",
      "blocked",
    ],
    ["claude", claudePrompt, "idle"],
    ["claude", `Enter to confirm · Esc to cancel\r\n${claudePrompt}`, "idle"],
    [
      "claude",
      "Enter to confirm · Esc to cancel\r\n✻ Working… (12s · esc to interrupt)",
      "working",
    ],
    ["claude", "The documentation mentions esc to cancel and working states.", "unknown"],
    [
      "claude",
      "✻ Working… (12s · esc to interrupt)\r\nShowing detailed transcript · ctrl+o to toggle",
      "unknown",
    ],
    ["codex", `• Working (1m 12s • esc to interrupt)\r\n${codexPrompt}`, "working"],
    [
      "codex",
      "Would you like to run this command?\r\n› 1. Yes\r\nPress enter to confirm or esc to cancel",
      "blocked",
    ],
    ["codex", "Which approach?\r\nEnter to submit answer", "blocked"],
    ["codex", codexPrompt, "idle"],
    ["codex", `Press enter to confirm or esc to cancel\r\nDone.\r\n${codexPrompt}`, "idle"],
    [
      "codex",
      "Press enter to confirm or esc to cancel\r\n• Working (12s • esc to interrupt)",
      "working",
    ],
    ["codex", "› a plain prompt without a known footer", "unknown"],
    ["codex", "Press enter to confirm or esc to cancel\r\n↑/↓ to scroll · q to quit", "unknown"],
  ] as const)("estimates %s from a live %s screen as %s", (provider, data, expected) => {
    const screen = appendTerminalAgentOutput(EMPTY_TERMINAL_AGENT_SCREEN, data);
    expect(estimateTerminalAgentState(provider, screen)).toBe(expected);
  });

  it("drops old approval controls after erase, cursor overwrite, and scrolling", () => {
    const blocked = appendTerminalAgentOutput(
      EMPTY_TERMINAL_AGENT_SCREEN,
      "Press enter to confirm or esc to cancel",
    );
    expect(estimateTerminalAgentState("codex", blocked)).toBe("blocked");
    for (const data of [
      "\u001b[2J\u001b[H",
      "\r\u001b[2KReady",
      "\r\n" + "completed\r\n".repeat(70),
    ]) {
      expect(estimateTerminalAgentState("codex", appendTerminalAgentOutput(blocked, data))).toBe(
        "unknown",
      );
    }
    const moved = appendTerminalAgentOutput(blocked, "\r\n\u001b[1A\r\u001b[2KDone\u001b[J");
    expect(estimateTerminalAgentState("codex", moved)).toBe("unknown");
  });

  it.each([
    { name: "single mode", enter: ["\u001b[?104", "9h"], leave: "\u001b[?1049l" },
    {
      name: "combined modes before the screen mode",
      enter: ["\u001b[?25;104", "9h"],
      leave: "\u001b[?1049;25l",
    },
    {
      name: "combined modes after the screen mode",
      enter: ["\u001b[?1049;2", "5h"],
      leave: "\u001b[?25;1049l",
    },
    { name: "hard reset", enter: ["\u001b[?104", "9h"], leave: "\u001bc" },
  ] as const)(
    "does not reuse approval controls across $name or incomplete escape chunks",
    ({ enter, leave }) => {
      let screen = appendTerminalAgentOutput(
        EMPTY_TERMINAL_AGENT_SCREEN,
        "Enter to confirm · Esc to cancel",
      );
      screen = appendTerminalAgentOutput(screen, enter[0]);
      expect(estimateTerminalAgentState("claude", screen)).toBe("unknown");
      screen = appendTerminalAgentOutput(screen, `${enter[1]}Enter to confirm · Esc to cancel`);
      expect(estimateTerminalAgentState("claude", screen)).toBe("unknown");
      screen = appendTerminalAgentOutput(screen, leave.slice(0, -1));
      expect(estimateTerminalAgentState("claude", screen)).toBe("unknown");
      screen = appendTerminalAgentOutput(screen, leave.slice(-1));
      expect(estimateTerminalAgentState("claude", screen)).toBe("unknown");
      screen = appendTerminalAgentOutput(screen, claudePrompt);
      expect(estimateTerminalAgentState("claude", screen)).toBe("idle");
    },
  );
});
