export type MobileStageLabel = "Beta" | "Dev" | "Preview";

export function resolveMobileStageLabel(appVariant: unknown): MobileStageLabel {
  if (appVariant === "development") return "Dev";
  if (appVariant === "preview") return "Preview";
  return "Beta";
}
