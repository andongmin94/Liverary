import { OrchestrationV2ThreadProjectionJson } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { yieldToHostTimer } from "./hostYield.ts";
import {
  ORCHESTRATION_THREAD_CACHE_SCHEMA_VERSION,
  StoredOrchestrationThreadSnapshot,
} from "./orchestrationCache.ts";

/**
 * A thread followed live keeps every item it streams, so its projection can grow
 * to hundreds of MB. Larger ones are not cached; reopening loads the bounded window.
 */
const THREAD_CACHE_MAX_JSON_LENGTH = 4 * 1024 * 1024;

const ROWS_PER_CHUNK = 32;

const EncodedRows = Schema.Array(Schema.Unknown);
const ProjectionWithEncodedRows = OrchestrationV2ThreadProjectionJson.mapFields((fields) => ({
  ...fields,
  turnItems: EncodedRows,
  visibleTurnItems: EncodedRows,
}));
const encodeFullEnvelope = Schema.encodeEffect(
  Schema.fromJsonString(
    StoredOrchestrationThreadSnapshot.mapFields((fields) => ({
      ...fields,
      snapshot: fields.snapshot.mapFields((snapshotFields) => ({
        ...snapshotFields,
        projection: ProjectionWithEncodedRows,
      })),
    })),
  ),
);
const encodeTurnItemChunk = Schema.encodeEffect(
  OrchestrationV2ThreadProjectionJson.fields.turnItems,
);
const encodeVisibleRowChunk = Schema.encodeEffect(
  OrchestrationV2ThreadProjectionJson.fields.visibleTurnItems,
);

type StoredThread = Pick<
  typeof StoredOrchestrationThreadSnapshot.Type,
  "environmentId" | "threadId" | "snapshot"
>;
type Projection = StoredThread["snapshot"]["projection"];

interface EncodedRow {
  readonly encoded: unknown;
  readonly length: number;
}

/**
 * Thread saves yield while encoding, so they can finish after a later save, a
 * removal, or an environment clear. Each takes a ticket when it starts; a save
 * writes only while no newer ticket exists for its thread or environment.
 */
export function makeThreadCacheWriteOrder() {
  let latest = 0;
  const tickets = new Map<string, number>();
  const threadKey = (environmentId: string, threadId: string) =>
    `${environmentId}\u0000${threadId}`;
  return {
    beginSave: (environmentId: string, threadId: string) => {
      const ticket = ++latest;
      const key = threadKey(environmentId, threadId);
      tickets.set(key, ticket);
      return () => tickets.get(key) === ticket && (tickets.get(environmentId) ?? 0) < ticket;
    },
    removeThread: (environmentId: string, threadId: string) => {
      tickets.set(threadKey(environmentId, threadId), ++latest);
    },
    clearEnvironment: (environmentId: string) => {
      tickets.set(environmentId, ++latest);
    },
  };
}

/**
 * Turn items are immutable and the projection reducer keeps unchanged ones by
 * reference, so each encoder remembers the encoding of rows it has encoded and
 * runs the row codec only for new ones, yielding to the host between chunks.
 * Encodes to none once the rows exceed `maxJsonLength`, before the envelope.
 */
export function makeStoredThreadSnapshotEncoder(options: {
  readonly yieldToHost?: Effect.Effect<void>;
  readonly maxJsonLength?: number;
}) {
  const yieldToHost = options.yieldToHost ?? yieldToHostTimer;
  const maxJsonLength = options.maxJsonLength ?? THREAD_CACHE_MAX_JSON_LENGTH;
  const encodedTurnItems = new WeakMap<object, EncodedRow>();
  const encodedVisibleRows = new WeakMap<object, EncodedRow>();

  return Effect.fnUntraced(function* (stored: StoredThread) {
    let hasWorked = false;
    let length = 0;
    const encodeRows =
      /* Runs once per thread save inside the traced store call; avoid a span per row list. */
      Effect.fnUntraced(function* <Row extends object>(
        rows: ReadonlyArray<Row>,
        cache: WeakMap<object, EncodedRow>,
        encodeChunk: (
          chunk: ReadonlyArray<Row>,
        ) => Effect.Effect<ReadonlyArray<unknown>, Schema.SchemaError>,
      ) {
        let misses: Array<Row> = [];
        const encodeMisses = Effect.gen(function* () {
          if (hasWorked) yield* yieldToHost;
          hasWorked = true;
          const chunk = yield* encodeChunk(misses);
          chunk.forEach((encoded, index) => {
            const row = { encoded, length: JSON.stringify(encoded).length };
            cache.set(misses[index]!, row);
            length += row.length;
          });
          misses = [];
        });
        for (const row of rows) {
          const cached = cache.get(row);
          if (cached === undefined) misses.push(row);
          else length += cached.length;
          if (misses.length === ROWS_PER_CHUNK) yield* encodeMisses;
          if (length > maxJsonLength) return undefined;
        }
        if (misses.length > 0) yield* encodeMisses;
        if (length > maxJsonLength) return undefined;
        return rows.map((row) => cache.get(row)!.encoded);
      });
    const encodeProjectionRows =
      /* Runs once per thread save inside the traced store call. */
      Effect.fnUntraced(function* (projection: Projection) {
        const turnItems = yield* encodeRows(
          projection.turnItems,
          encodedTurnItems,
          encodeTurnItemChunk,
        );
        if (turnItems === undefined) return undefined;
        const visibleTurnItems = yield* encodeRows(
          projection.visibleTurnItems,
          encodedVisibleRows,
          encodeVisibleRowChunk,
        );
        if (visibleTurnItems === undefined) return undefined;
        if (hasWorked) yield* yieldToHost;
        return { ...projection, turnItems, visibleTurnItems };
      });

    const { snapshot } = stored;
    const projection = yield* encodeProjectionRows(snapshot.projection);
    if (projection === undefined) return Option.none<string>();
    const payload = yield* encodeFullEnvelope({
      ...stored,
      schemaVersion: ORCHESTRATION_THREAD_CACHE_SCHEMA_VERSION,
      snapshot: { ...snapshot, projection },
    });
    // The rest of the projection is not budgeted row by row; a huge one still stays out.
    return payload.length > maxJsonLength ? Option.none<string>() : Option.some(payload);
  });
}
