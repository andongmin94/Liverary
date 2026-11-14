// @effect-diagnostics nodeBuiltinImport:off -- inspect optional Desktop state without mutating the provider's home.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const ObjectRecord = Schema.Record(Schema.String, Schema.Unknown);
const Assignment = Schema.Struct({
  projectKind: Schema.Literals(["local", "remote"]),
  projectId: Schema.String,
});
const DesktopState = Schema.Struct({
  "local-projects": ObjectRecord,
  "thread-project-assignments": Schema.optionalKey(Schema.Record(Schema.String, Assignment)),
  "pinned-thread-ids": Schema.optionalKey(Schema.Array(Schema.String)),
  "projectless-thread-ids": Schema.optionalKey(Schema.Array(Schema.String)),
  "electron-renderer-content-owner": Schema.optionalKey(Schema.String),
});
const decodeRawState = Schema.decodeUnknownSync(Schema.fromJsonString(ObjectRecord));
const decodeState = Schema.decodeUnknownSync(DesktopState);
const decodeAtoms = Schema.decodeUnknownOption(ObjectRecord);
const decodeWorkspace = Schema.decodeUnknownOption(
  Schema.Struct({
    project: Schema.NullOr(Assignment),
    projectMembership: Schema.optionalKey(Assignment),
  }),
);

export function readCodexDesktopExcludedNativeIds(homePath: string): ReadonlySet<string> {
  try {
    const raw = decodeRawState(
      NodeFS.readFileSync(NodePath.join(homePath, ".codex-global-state.json"), "utf8"),
    );
    const state = decodeState(raw);
    const owner = state["electron-renderer-content-owner"];
    const atoms = Option.getOrUndefined(
      decodeAtoms(
        raw[
          owner === undefined ? "electron-persisted-atom-state" : `electron-owner-atoms:${owner}`
        ],
      ),
    );
    const assignments = state["thread-project-assignments"] ?? {};
    const pinned = new Set(state["pinned-thread-ids"]);
    const projectless = new Set(state["projectless-thread-ids"]);
    const prefix = "thread-workspace-state-v1:";
    const ids = new Set([
      ...Object.keys(assignments),
      ...Object.keys(atoms ?? {})
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length)),
    ]);
    const excluded = new Set<string>();
    for (const id of ids) {
      const workspace = decodeWorkspace(atoms?.[`${prefix}${id}`]);
      const assignment = Option.isSome(workspace)
        ? (workspace.value.projectMembership ?? workspace.value.project)
        : assignments[id];
      const isProjectless = Option.isSome(workspace) ? assignment === null : projectless.has(id);
      if (
        !pinned.has(id) &&
        !isProjectless &&
        assignment?.projectKind === "local" &&
        !Object.hasOwn(state["local-projects"], assignment.projectId)
      )
        excluded.add(id);
    }
    return excluded;
  } catch {
    return new Set();
  }
}
