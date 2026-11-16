// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";

import { OrchestrationWorkflowFileError } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as HostProcess from "@t3tools/shared/HostProcess";

export interface WorkflowFileIdentity {
  readonly dev: number;
  readonly ino: number;
}

function workflowFilesRoot(home: string, configDir?: string): string {
  return NodePath.join(configDir?.trim() || NodePath.join(home, ".claude"), "projects");
}

export const readContainedWorkflowFile = Effect.fn("orchestration.readContainedWorkflowFile")(
  function* (input: {
    readonly path: string;
    readonly extension: string;
    readonly byteCap: number;
    readonly tail?: boolean;
    readonly configDir?: string;
    /** Reads complete lines from a byte offset; resets to zero after shrinkage or inode changes. */
    readonly fromOffset?: {
      readonly offset: number;
      readonly identity: WorkflowFileIdentity | null;
    };
  }) {
    if (!NodePath.isAbsolute(input.path) || NodePath.extname(input.path) !== input.extension) {
      return yield* new OrchestrationWorkflowFileError({
        reason: "invalid-path",
        path: input.path,
      });
    }

    const home = yield* HostProcess.HomeDirectory;
    const root = yield* Effect.tryPromise({
      try: () => NodeFSP.realpath(workflowFilesRoot(home, input.configDir)),
      catch: (cause) =>
        new OrchestrationWorkflowFileError({
          reason: "root-unavailable",
          path: input.path,
          cause,
        }),
    });

    // Resolve the file itself; contained directories can still hold escaping symlinks.
    const resolved = yield* Effect.tryPromise({
      try: () => NodeFSP.realpath(input.path),
      catch: (cause) =>
        new OrchestrationWorkflowFileError({ reason: "not-found", path: input.path, cause }),
    });

    if (resolved !== root && !resolved.startsWith(`${root}${NodePath.sep}`)) {
      return yield* new OrchestrationWorkflowFileError({ reason: "outside-root", path: resolved });
    }
    if (NodePath.extname(resolved) !== input.extension) {
      return yield* new OrchestrationWorkflowFileError({
        reason: "wrong-extension",
        path: resolved,
      });
    }

    // Inode checks catch leaf swaps, not intermediate directory swaps; the 0700 ~/.claude root restricts those to our uid.
    const read = yield* Effect.tryPromise({
      try: async () => {
        const handle = await NodeFSP.open(
          resolved,
          NodeFS.constants.O_RDONLY | (NodeFS.constants.O_NONBLOCK ?? 0),
        );
        try {
          const stat = await handle.stat();
          if (!stat.isFile()) {
            return { failure: "not-regular-file" as const };
          }
          const pathStat = await NodeFSP.lstat(resolved);
          if (stat.ino !== pathStat.ino || stat.dev !== pathStat.dev) {
            return { failure: "changed-during-read" as const };
          }
          const identity = { dev: stat.dev, ino: stat.ino };
          const readBytes = async (position: number, length: number) => {
            const buffer = Buffer.alloc(length);
            let offset = 0;
            while (offset < buffer.length) {
              const { bytesRead } = await handle.read(
                buffer,
                offset,
                buffer.length - offset,
                position + offset,
              );
              if (bytesRead <= 0) break;
              offset += bytesRead;
            }
            return buffer.subarray(0, offset);
          };
          if (input.fromOffset !== undefined) {
            const previous = input.fromOffset.identity;
            const start =
              previous !== null &&
              previous.dev === identity.dev &&
              previous.ino === identity.ino &&
              input.fromOffset.offset <= stat.size
                ? input.fromOffset.offset
                : 0;
            const read = await readBytes(start, Math.min(stat.size - start, input.byteCap));
            // Defer partial lines; skip single over-cap lines so the cursor can advance.
            const lineEnd = read.lastIndexOf(0x0a) + 1;
            const consumed = lineEnd === 0 && read.length === input.byteCap ? read.length : lineEnd;
            return {
              contents: read.subarray(0, lineEnd).toString("utf8"),
              // Only the cap signals truncation; a half-written last line does not.
              truncated: stat.size - start > input.byteCap,
              startOffset: start,
              endOffset: start + consumed,
              identity,
            };
          }
          const length = Math.min(stat.size, input.byteCap + (input.tail ? 1 : 0));
          const truncated = stat.size > length;
          const offset = input.tail ? stat.size - length : 0;
          const read = await readBytes(offset, length);
          return {
            contents: read.toString("utf8"),
            truncated,
            startOffset: offset,
            endOffset: offset + read.length,
            identity,
          };
        } finally {
          await handle.close();
        }
      },
      catch: (cause) =>
        new OrchestrationWorkflowFileError({ reason: "read-failed", path: resolved, cause }),
    });
    if ("failure" in read) {
      return yield* new OrchestrationWorkflowFileError({ reason: read.failure, path: resolved });
    }

    return {
      path: resolved,
      contents: read.contents,
      truncated: read.truncated,
      startOffset: read.startOffset,
      endOffset: read.endOffset,
      identity: read.identity,
    };
  },
);
