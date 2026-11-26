import { RunId } from "@t3tools/contracts";
import type { TimestampFormat } from "@t3tools/contracts/settings";
import { describe, expect, it, vi } from "vite-plus/test";

import { usageLimitRecoveryBannerItem } from "./UsageLimitRecoveryBanner";

const stoppedAt = new Date(2026, 9, 20, 12, 0);

function bannerItem(resetAt: Date, timestampFormat: TimestampFormat = "24-hour") {
  return usageLimitRecoveryBannerItem({
    runId: RunId.make("run-1"),
    errorCode: null,
    resetAt: resetAt.toISOString(),
    stoppedAt: stoppedAt.toISOString(),
    settled: false,
    requestPending: false,
    snoozedUntil: null,
    recovery: null,
    timestampFormat,
    onChange: async () => {},
  });
}

describe("usageLimitRecoveryBannerItem", () => {
  it.each([
    ["12-hour", "오후 5:30에 초기화"],
    ["24-hour", "17:30에 초기화"],
  ] as const)("formats a same-day reset with the %s setting", (timestampFormat, expected) => {
    using _now = vi.spyOn(Date, "now").mockReturnValue(stoppedAt.getTime());
    expect(bannerItem(new Date(2026, 9, 20, 17, 30), timestampFormat).description).toBe(expected);
  });

  it("names the day when the reset is tomorrow", () => {
    using _now = vi.spyOn(Date, "now").mockReturnValue(stoppedAt.getTime());
    expect(bannerItem(new Date(2026, 9, 21, 17, 30)).description).toBe("내일 17:30에 초기화");
  });

  it("uses past-tense copy after the reset time has passed", () => {
    const resetAt = new Date(2026, 9, 20, 15, 0);
    {
      using _before = vi
        .spyOn(Date, "now")
        .mockReturnValue(new Date(2026, 9, 20, 14, 57).getTime());
      expect(bannerItem(resetAt).description).toBe("15:00에 초기화");
    }
    {
      using _after = vi.spyOn(Date, "now").mockReturnValue(new Date(2026, 9, 20, 15, 14).getTime());
      expect(bannerItem(resetAt).description).toBe("15:00에 초기화됨");
    }
  });

  it("keeps Resumes copy until a later snooze wake time, then falls back to Reset", () => {
    const resetAt = new Date(2026, 9, 20, 15, 0);
    const snoozedUntil = new Date(2026, 9, 20, 16, 0);
    const runId = RunId.make("run-1");
    const makeScheduled = () =>
      usageLimitRecoveryBannerItem({
        runId,
        errorCode: null,
        resetAt: resetAt.toISOString(),
        stoppedAt: stoppedAt.toISOString(),
        settled: false,
        requestPending: false,
        snoozedUntil: snoozedUntil.toISOString(),
        recovery: {
          runId,
          resetAt: resetAt.toISOString(),
          autoResume: true,
        },
        timestampFormat: "24-hour",
        onChange: async () => {},
      });
    {
      using _between = vi
        .spyOn(Date, "now")
        .mockReturnValue(new Date(2026, 9, 20, 15, 14).getTime());
      expect(makeScheduled().description).toBe("16:00에 재개");
    }
    {
      using _afterSnooze = vi
        .spyOn(Date, "now")
        .mockReturnValue(new Date(2026, 9, 20, 16, 5).getTime());
      expect(makeScheduled().description).toBe("15:00에 초기화됨");
    }
  });
});
