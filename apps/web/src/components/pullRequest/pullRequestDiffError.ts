import { workspaceMessages, workspaceText } from "~/locales/ko/workspace";
/** Diff failures currently include transport wrappers, so recognize the reason inside them. */
export function describePullRequestDiffError(error: string, providerName: string, term: string) {
  if (/\brate limit\b|\brate[-_]limited\b|\btoo many requests\b/i.test(error)) {
    return {
      title: workspaceMessages["{0} rate limit reached"](providerName),
      description: workspaceMessages[
        "{0} is temporarily limiting requests, so this diff couldn't be loaded. Try again after the limit resets, or view the changes on {1}."
      ](providerName, providerName),
    };
  }

  return {
    title: workspaceText["Couldn't load the changes"],
    description: workspaceMessages[
      "The environment couldn't load this {0}'s diff. Try again, or view the changes on {1}."
    ](term, providerName),
  };
}
