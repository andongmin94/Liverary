import { msg } from "gt-react";
import { m } from "../../i18n/messages";

/** Diff failures currently include transport wrappers, so recognize the reason inside them. */
export function describePullRequestDiffError(error: string, providerName: string, term: string) {
  if (/\brate limit\b|\brate[-_]limited\b|\btoo many requests\b/i.test(error)) {
    return {
      title: m(msg("{value0} rate limit reached", { value0: String(providerName) })),
      description: m(
        msg(
          "{value0} is temporarily limiting requests, so this diff couldn't be loaded. Try again after the limit resets, or view the changes on {value1}.",
          { value0: String(providerName), value1: String(providerName) },
        ),
      ),
    };
  }

  return {
    title: m(msg("Couldn't load the changes")),
    description: m(
      msg(
        "The environment couldn't load this {value0}'s diff. Try again, or view the changes on {value1}.",
        { value0: String(term), value1: String(providerName) },
      ),
    ),
  };
}
