import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import {
  NativeSessionError,
  type NativeSessionMessage,
  type NativeSessionSummary,
  type ProviderNativeSessions,
} from "@t3tools/provider-core/server/nativeSessions";
import { MuseItem } from "./protocol.ts";
import {
  createMuseSdkHostEffect,
  type MuseSdkHost,
  type MuseSdkHostOptions,
  MuseSdkError,
} from "./sdk.ts";

const Session = Schema.Struct({
  sessionId: Schema.NonEmptyString,
  workspaceRoot: Schema.NullOr(Schema.String),
  name: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  modelId: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});
const SessionList = Schema.Struct({
  sessions: Schema.Array(Session),
  nextCursor: Schema.NullOr(Schema.String),
});
const SessionRead = Schema.Struct({
  session: Session,
  history: Schema.Struct({
    items: Schema.NullOr(Schema.Array(MuseItem)),
    snapshot: Schema.NullOr(
      Schema.Struct({ state: Schema.Struct({ items: Schema.Array(MuseItem) }) }),
    ),
  }),
});
const isSessionNotFound = Schema.is(Schema.Struct({ kind: Schema.Literal("sessionNotFound") }));
const isMuseSdkError = Schema.is(MuseSdkError);

export function makeMuseNativeSessions(
  options: Pick<MuseSdkHostOptions, "binaryPath" | "environment" | "launchArgs">,
  createHost: (
    options: Omit<MuseSdkHostOptions, "signal">,
  ) => Effect.Effect<MuseSdkHost, MuseSdkError> = createMuseSdkHostEffect,
): ProviderNativeSessions {
  const failure = (operation: string) => (cause: unknown) =>
    new NativeSessionError({
      operation,
      detail: "Muse native session operation failed.",
      ...(operation === "read" && isSessionNotFound(isMuseSdkError(cause) ? cause.cause : cause)
        ? { notFound: true }
        : {}),
      cause,
    });
  const withHost = <A, E, R>(run: (host: MuseSdkHost) => Effect.Effect<A, E, R>) =>
    Effect.scoped(
      Effect.acquireRelease(
        createHost({ ...options, readOnly: true, sessionLogging: true }).pipe(
          Effect.mapError(failure("connect")),
        ),
        (host) =>
          Effect.tryPromise({
            try: () => host.close(),
            catch: (cause) => new MuseSdkError({ operation: "close", cause }),
          }).pipe(Effect.ignore),
        { interruptible: true },
      ).pipe(Effect.flatMap(run)),
    );

  const connected = (host: MuseSdkHost): ProviderNativeSessions => ({
    scope: "global",
    list: Effect.fn("MuseNativeSessions.list")(
      function* () {
        const sessions: NativeSessionSummary[] = [];
        let cursor: string | null = null;
        let complete = true;
        do {
          const page = yield* Effect.tryPromise({
            try: () =>
              host.connection.request("session/list", {
                limit: 200,
                ...(cursor ? { cursor } : {}),
              }),
            catch: (cause) => new MuseSdkError({ operation: "session/list", cause }),
          }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(SessionList)));
          for (const session of page.sessions) {
            if (!session.workspaceRoot) {
              complete = false;
              continue;
            }
            sessions.push({
              nativeId: session.sessionId,
              cwd: session.workspaceRoot,
              title: session.name || session.title || session.sessionId,
              ...(session.modelId ? { model: session.modelId } : {}),
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
              state: "active",
            });
          }
          cursor = page.nextCursor;
        } while (cursor);
        return { sessions, complete };
      },
      Effect.mapError(failure("list")),
    ),
    read: Effect.fn("MuseNativeSessions.read")(
      function* ({ nativeId }) {
        const result = yield* Effect.tryPromise({
          try: () =>
            host.connection.request("session/read", { sessionId: nativeId, excludeItems: false }),
          catch: (cause) => new MuseSdkError({ operation: "session/read", cause }),
        }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(SessionRead)));
        const items = result.history.items ?? result.history.snapshot?.state.items;
        if (!items)
          return yield* new NativeSessionError({
            operation: "read",
            detail: "Muse did not return the saved conversation history.",
          });
        return items.flatMap((item): NativeSessionMessage[] =>
          (item.kind === "userMessage" || item.kind === "agentMessage") &&
          !item.retracted &&
          item.text
            ? [
                {
                  id: item.itemId,
                  ...(item.turnId ? { turnId: item.turnId } : {}),
                  role: item.kind === "userMessage" ? "user" : "assistant",
                  text: item.text,
                  createdAt: item.recordedAt ?? result.session.createdAt,
                },
              ]
            : [],
        );
      },
      Effect.mapError(failure("read")),
    ),
  });
  return {
    scope: "global",
    withConnection: (use) => withHost((host) => use(connected(host))),
    list: (input) => withHost((host) => connected(host).list(input)),
    read: (input) => withHost((host) => connected(host).read!(input)),
  };
}
