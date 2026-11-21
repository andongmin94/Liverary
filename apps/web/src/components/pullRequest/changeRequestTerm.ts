import type { ChangeRequestTerminology } from "@t3tools/client-runtime/source-control-clients";

export type ChangeRequestTermKind = ReturnType<typeof changeRequestTermKind>;

export function changeRequestTermKind(terminology: Pick<ChangeRequestTerminology, "singular">) {
  if (terminology.singular === "merge request") return "mr";
  if (terminology.singular === "change request") return "cr";
  return "pr";
}
