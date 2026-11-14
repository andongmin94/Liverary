import type * as SqlClient from "effect/sql/SqlClient";

export const isNativeSessionListed = (sql: SqlClient.SqlClient, trustedAlias: string) => sql`
  NOT EXISTS (
    SELECT 1 FROM native_session_sync s
    INNER JOIN orchestration_v2_projection_provider_threads p
      ON p.provider_thread_id = s.provider_thread_id
    WHERE p.provider_thread_id = ${sql.literal(`${trustedAlias}.active_provider_thread_id`)}
      AND s.native_id = json_extract(p.payload_json, '$.nativeThreadRef.nativeId')
      AND s.catalog_excluded = 1
  )
`;
