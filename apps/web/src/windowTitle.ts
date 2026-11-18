/**
 * Names the open thread: `project / thread` on desktop, where the OS already
 * shows the app, with the app name appended in browser tabs.
 */
export function resolveWindowTitle(input: {
  readonly appDisplayName: string;
  readonly projectTitle: string | null;
  readonly threadTitle: string | null;
  /** The screen reader title: status, then thread, then project, since a screen reader reads from the start. */
  readonly screenReader?: { readonly threadStatus: string | null };
  readonly desktop: boolean;
}): string {
  const threadTitle = input.threadTitle?.trim() ?? "";
  const status = input.screenReader?.threadStatus;
  if (threadTitle === "") {
    return status ? `${status}: ${input.appDisplayName}` : input.appDisplayName;
  }

  const projectTitle = input.projectTitle?.trim() ?? "";
  const context =
    projectTitle === ""
      ? threadTitle
      : input.screenReader
        ? `${threadTitle} - ${projectTitle}`
        : `${projectTitle} / ${threadTitle}`;
  const title = status ? `${status}: ${context}` : context;
  return input.desktop ? title : `${title} - ${input.appDisplayName}`;
}
