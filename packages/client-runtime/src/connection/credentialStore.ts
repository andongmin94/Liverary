import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import type { ConnectionCredential } from "./catalog.ts";
import type { ConnectionAttemptError } from "./model.ts";

export class ConnectionCredentialStore extends Context.Service<
  ConnectionCredentialStore,
  {
    readonly get: (
      connectionId: string,
    ) => Effect.Effect<Option.Option<ConnectionCredential>, ConnectionAttemptError>;
    readonly put: (
      connectionId: string,
      credential: ConnectionCredential,
    ) => Effect.Effect<void, ConnectionAttemptError>;
    readonly remove: (connectionId: string) => Effect.Effect<void, ConnectionAttemptError>;
  }
>()("@t3tools/client-runtime/connection/credentialStore/ConnectionCredentialStore") {}

export const make = (service: ConnectionCredentialStore["Service"]) =>
  ConnectionCredentialStore.of(service);
