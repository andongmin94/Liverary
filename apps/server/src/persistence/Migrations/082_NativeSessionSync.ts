import * as Effect from "effect/Effect";
import * as SqlClient from "effect/sql/SqlClient";

export default Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`
    CREATE TABLE native_session_sync (
      provider_thread_id TEXT PRIMARY KEY,
      catalog_id TEXT,
      native_id TEXT NOT NULL,
      native_state TEXT NOT NULL,
      native_revision TEXT,
      native_updated_at TEXT NOT NULL
    )
  `;
  yield* sql`
    CREATE TABLE native_session_messages (
      provider_thread_id TEXT NOT NULL,
      native_id TEXT NOT NULL,
      message_id TEXT,
      PRIMARY KEY (provider_thread_id, native_id)
    )
  `;
});
