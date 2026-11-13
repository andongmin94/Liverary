import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export type NativeSessionState = "active" | "archived" | "deleted";

export interface NativeSessionSummary {
  /** Empty only for a catalog tombstone whose native ID is no longer available. */
  readonly nativeId: string;
  /** Stable desktop/catalog identity when a rewind replaces the native transcript ID. */
  readonly catalogId?: string;
  /** Previous native IDs belonging to the same conversation, for example after a rewind. */
  readonly aliases?: ReadonlyArray<string>;
  readonly cwd: string;
  readonly title: string;
  readonly model?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Provider history revision, when catalog timestamps alone cannot identify an edit. */
  readonly revision?: string;
  readonly state: NativeSessionState;
}

export interface NativeSessionMessage {
  readonly id: string;
  readonly turnId?: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly createdAt: string;
}

export class NativeSessionError extends Schema.TaggedError<NativeSessionError>()(
  "NativeSessionError",
  {
    operation: Schema.String,
    detail: Schema.String,
    notFound: Schema.optional(Schema.Boolean),
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Native session ${this.operation} failed: ${this.detail}`;
  }
}

export interface NativeSessionAddress {
  readonly nativeId: string;
  readonly cwd: string;
}

/** Operations on the provider's own persistent sessions; never starts a model turn. */
export interface ProviderNativeSessions {
  readonly scope: "global" | "workspace";
  /** This integration uses a separate store from the provider's desktop/IDE application. */
  readonly isolatedStore?: boolean;
  readonly watchPaths?: ReadonlyArray<string>;
  /** Reuse one management connection while refreshing a catalog and its changed histories. */
  readonly withConnection?: <A, E, R>(
    use: (sessions: ProviderNativeSessions) => Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E | NativeSessionError, R>;
  readonly list: (input: { readonly cwd?: string }) => Effect.Effect<
    {
      readonly sessions: ReadonlyArray<NativeSessionSummary>;
      /** True only after every page in this scope was read successfully, including archives.
       * Missing known sessions still require a read that explicitly reports notFound.
       */
      readonly complete: boolean;
    },
    NativeSessionError
  >;
  readonly read?: (
    input: NativeSessionAddress,
  ) => Effect.Effect<ReadonlyArray<NativeSessionMessage>, NativeSessionError>;
  readonly setArchived?: (
    input: NativeSessionAddress & { readonly archived: boolean },
  ) => Effect.Effect<void, NativeSessionError>;
  readonly delete?: (input: NativeSessionAddress) => Effect.Effect<void, NativeSessionError>;
  /** A transcript-only deletion does not remove a separate desktop/cloud catalog entry. */
  readonly deletionScope?: "session" | "transcript";
}
