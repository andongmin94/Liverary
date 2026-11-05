---
title: Test Signal
model: gpt-6-1-terra
reasoning: low
input: incremental
tools:
  - browse_code
  - modify_pr
# An explicit include overrides ignore.md, which skips test files for every other check.
include:
  - "**/*.test.*"
requires:
  - Check
maxBudgetPerRun: 1
maxBudgetPerPR: 5
conclusion: neutral
---

# Test signal review

Review only the tests this pull request adds or grows. Tests it moves, renames, or deletes are not findings. Read [AGENTS.md](../../AGENTS.md#verifying) under `## Verifying` and hold new tests to those rules.

Post each finding as a brief inline comment on the new test with one fix. Ask only for fewer or smaller tests, never for more coverage.

When there are no findings, make the entire final response exactly `All clear` on one line with nothing else.
