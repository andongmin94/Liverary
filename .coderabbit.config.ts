import { defineConfig, type CodeRabbitContext } from "@coderabbitai/config";

const UNGATED_AUTHORS = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);
const isGated = ({ pr }: CodeRabbitContext) => !UNGATED_AUTHORS.has(pr?.authorAssociation ?? "");

export default defineConfig((ctx) => ({
  reviews: {
    high_level_summary: false,
    review_status: false,
    request_changes_workflow: false,
    allow_author_approval: !isGated(ctx),
    auto_review: {
      enabled: true,
    },
    pre_merge_checks: {
      docstrings: { mode: "off" },
      override_requested_reviewers_only: isGated(ctx),
    },
    path_instructions: [
      {
        path: "{apps,packages,infra}/**/*.ts",
        instructions: "Follow the service boundaries and Effect conventions in AGENTS.md.",
      },
      {
        path: "apps/web/src/**/*.{tsx,css}",
        instructions: "Follow the web UI rules in AGENTS.md.",
      },
      {
        path: "**/*.test.*",
        instructions:
          "Follow the verification rules in AGENTS.md. Request tests only as those rules allow.",
      },
    ],
  },
  knowledge_base: {
    code_guidelines: {
      filePatterns: [{ files: "AGENTS.md", applyTo: "{apps,packages,infra}/**/*.{ts,tsx,css}" }],
    },
  },
}));
