import type { ElementType } from "react";
import { applicationText } from "~/locales/ko/application";
import type { SourceControlProviderInfo } from "@t3tools/contracts";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import type {
  ChangeRequestTerminology,
  SourceControlDefinition,
} from "@t3tools/client-runtime/source-control-clients";
import { PullRequestGlyph } from "~/components/pullRequest/pullRequestIcons";
import { SourceControlIconArtwork } from "./components/SourceControlIconArtwork";

export type { ChangeRequestTerminology } from "@t3tools/client-runtime/source-control-clients";

const changeRequestLabels: Record<string, string> = {
  "a pr": "PR",
  "an mr": "MR",
  "a change request": applicationText["Change request"],
  "pull request": "Pull Request",
  "pull requests": "Pull Request",
  "merge request": "Merge Request",
  "merge requests": "Merge Request",
  "change request": applicationText["Change request"],
  "change requests": applicationText["Change request"],
};

export function localizeChangeRequestTerm(term: string) {
  return changeRequestLabels[term.toLowerCase()] ?? term;
}

export function localizeChangeRequestTerminology(terminology: ChangeRequestTerminology) {
  const shortLabel = localizeChangeRequestTerm(terminology.shortLabel);
  return {
    shortLabel,
    shortLabelWithArticle: shortLabel,
    singular: localizeChangeRequestTerm(terminology.singular),
    plural: localizeChangeRequestTerm(terminology.plural),
  };
}

type SourceControlIcon = ElementType<{ className?: string }>;

const SOURCE_CONTROL_ICONS = new WeakMap<SourceControlDefinition, SourceControlIcon>();

/** One component per definition, so a host's icon keeps its identity across renders. */
export function sourceControlIcon(definition: SourceControlDefinition): SourceControlIcon {
  const artwork = definition.icon;
  if (artwork === null) return PullRequestGlyph.pullRequest;
  let Icon = SOURCE_CONTROL_ICONS.get(definition);
  if (Icon === undefined) {
    Icon = (props: { className?: string }) => (
      <SourceControlIconArtwork {...props} icon={artwork} />
    );
    SOURCE_CONTROL_ICONS.set(definition, Icon);
  }
  return Icon;
}

export interface SourceControlPresentation {
  readonly definition: SourceControlDefinition;
  readonly providerName: string;
  readonly terminology: ChangeRequestTerminology;
  readonly Icon: SourceControlIcon;
}

function presentDefinition(
  definition: SourceControlDefinition,
  providerName: string,
): SourceControlPresentation {
  return {
    definition,
    providerName,
    terminology: definition.changeRequest,
    Icon: sourceControlIcon(definition),
  };
}

export function getSourceControlPresentation(
  provider: SourceControlProviderInfo | null | undefined,
): SourceControlPresentation {
  const definition = sourceControlClients.get(provider?.kind);
  return presentDefinition(definition, provider?.name || definition.label);
}

export function getSourceControlPresentationForKind(kind: string): SourceControlPresentation {
  const definition = sourceControlClients.get(kind);
  return presentDefinition(definition, definition.label);
}
