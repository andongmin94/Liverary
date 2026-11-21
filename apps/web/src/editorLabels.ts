import { msg } from "gt-react";
import { m } from "./i18n/messages";

import { EDITORS, type EditorId } from "@t3tools/contracts";

import { getLocalFileManagerName } from "~/lib/utils";

const editorLabels = new Map<EditorId, string>(EDITORS.map((editor) => [editor.id, editor.label]));

export function editorLabelForPlatform(editorId: EditorId, platform: string): string {
  if (editorId === "file-manager") {
    return getLocalFileManagerName(platform);
  }

  return editorLabels.get(editorId) ?? m(msg("Editor"));
}

export function openInEditorMenuLabel(editorId: EditorId | null): string {
  return editorId === null || editorId === "file-manager"
    ? m(msg("Open in editor"))
    : m(msg("Open in {name}", { name: String(editorLabels.get(editorId) ?? m(msg("Editor"))) }));
}
