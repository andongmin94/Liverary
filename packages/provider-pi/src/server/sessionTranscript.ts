import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type {
  NativeSessionMessage,
  NativeSessionSummary,
} from "@t3tools/provider-core/server/nativeSessions";

const Entry = Schema.Struct({
  type: Schema.optional(Schema.String),
  id: Schema.optional(Schema.String),
  parentId: Schema.optional(Schema.NullOr(Schema.String)),
  name: Schema.optional(Schema.String),
  timestamp: Schema.optional(Schema.String),
  cwd: Schema.optional(Schema.String),
  modelId: Schema.optional(Schema.String),
  message: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        role: Schema.optional(Schema.String),
        content: Schema.optional(Schema.Unknown),
        model: Schema.optional(Schema.String),
      }),
    ),
  ),
});
type Entry = typeof Entry.Type;
const decodeEntry = Schema.decodeUnknownOption(Schema.fromJsonString(Entry));

function isPiConversationRecord(record: Entry): record is Entry & {
  readonly message: NonNullable<Entry["message"]> & { readonly role: "user" | "assistant" };
} {
  return (
    record.type === "message" &&
    (record.message?.role === "user" || record.message?.role === "assistant")
  );
}

function activeBranch(records: ReadonlyArray<Entry>): ReadonlyArray<Entry> {
  const entries = records.filter((record) => record.type !== "session");
  const leaf = entries.at(-1);
  if (leaf?.id === undefined) return entries;
  const byId = new Map(
    entries.flatMap((entry) => (entry.id === undefined ? [] : [[entry.id, entry] as const])),
  );
  const branch: Entry[] = [];
  for (
    let entry: Entry | undefined = leaf;
    entry !== undefined && branch.length < entries.length;
    entry = entry.parentId ? byId.get(entry.parentId) : undefined
  ) {
    branch.push(entry);
  }
  return branch.toReversed();
}

function timestamp(value: string | undefined, fallback: string): string {
  const parsed = value === undefined ? Option.none() : DateTime.make(value);
  return Option.isSome(parsed) ? DateTime.formatIso(parsed.value) : fallback;
}

function piConversationMessages(
  records: ReadonlyArray<Entry>,
  fallbackTimestamp: string,
): NativeSessionMessage[] {
  const ordinals = new Map(records.map((entry, index) => [entry, index]));
  return activeBranch(records).flatMap((record): NativeSessionMessage[] => {
    if (!isPiConversationRecord(record)) return [];
    const content = record.message.content;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content
              .flatMap((part: unknown) => {
                if (
                  typeof part !== "object" ||
                  part === null ||
                  !("type" in part) ||
                  !("text" in part)
                )
                  return [];
                return (part.type === "text" ||
                  part.type === "input_text" ||
                  part.type === "output_text") &&
                  typeof part.text === "string" &&
                  part.text.trim().length > 0
                  ? [part.text]
                  : [];
              })
              .join("\n")
          : "";
    return text.trim().length === 0
      ? []
      : [
          {
            id: record.id ?? `line:${ordinals.get(record)}`,
            role: record.message.role,
            text,
            createdAt: timestamp(record.timestamp, fallbackTimestamp),
          },
        ];
  });
}

export function parsePiNativeSession(
  contents: string,
  filePath: string,
  modifiedAtMs: number,
):
  | {
      readonly summary: NativeSessionSummary;
      readonly messages: ReadonlyArray<NativeSessionMessage>;
    }
  | undefined {
  const records = contents.split("\n").flatMap((line) => Option.toArray(decodeEntry(line)));
  const header = records.find((record) => record.type === "session");
  if (!header?.cwd) return undefined;
  const updatedAt = DateTime.formatIso(DateTime.makeUnsafe(modifiedAtMs));
  const createdAt = timestamp(header.timestamp, updatedAt);
  const messages = piConversationMessages(records, createdAt);
  const title =
    records.findLast((record) => record.type === "session_info")?.name?.trim() ||
    messages
      .find((message) => message.role === "user")
      ?.text.trim()
      .split("\n")[0]
      ?.slice(0, 100) ||
    header.id ||
    filePath;
  const model = records.findLast((record) => record.message?.model || record.modelId);
  return {
    summary: {
      nativeId: filePath,
      ...(header.id ? { aliases: [header.id] } : {}),
      cwd: header.cwd,
      title,
      ...(model ? { model: model.message?.model ?? model.modelId! } : {}),
      createdAt,
      updatedAt,
      state: "active",
    },
    messages,
  };
}
