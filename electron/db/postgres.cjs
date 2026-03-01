const { Client } = require("pg");

async function withClient(payload, run) {
  const client = new Client({
    host: payload.host,
    port: Number(payload.port),
    database: payload.database,
    user: payload.username,
    password: payload.password,
    ssl: payload.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    return await run(client);
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore disconnect errors.
    }
  }
}

async function testPostgresConnection(payload) {
  try {
    await withClient(payload, (client) => client.query("SELECT 1"));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function listPostgresSchemas(payload) {
  try {
    const result = await withClient(payload, (client) =>
      client.query(
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') AND schema_name NOT LIKE 'pg_temp_%' AND schema_name NOT LIKE 'pg_toast_temp_%' ORDER BY schema_name",
      ),
    );

    return { ok: true, schemas: result.rows.map((row) => row.schema_name) };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to load schemas",
    };
  }
}

async function listPostgresTables(payload, schema) {
  try {
    const result = await withClient(payload, (client) =>
      client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name",
        [schema],
      ),
    );

    return { ok: true, tables: result.rows.map((row) => row.table_name) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to load tables",
    };
  }
}

async function listPostgresColumns(payload, schema, table) {
  try {
    const [columnsResult, primaryResult, foreignResult] = await withClient(
      payload,
      async (client) => {
        const columnsPromise = client.query(
          "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
          [schema, table],
        );
        const primaryPromise = client.query(
          "SELECT a.attname AS column_name FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey) WHERE i.indisprimary AND n.nspname = $1 AND c.relname = $2",
          [schema, table],
        );
        const foreignPromise = client.query(
          "SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2",
          [schema, table],
        );

        return Promise.all([columnsPromise, primaryPromise, foreignPromise]);
      },
    );

    const primarySet = new Set(
      primaryResult.rows.map((row) => row.column_name),
    );
    const foreignSet = new Set(
      foreignResult.rows.map((row) => row.column_name),
    );

    const columns = columnsResult.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      isPrimary: primarySet.has(row.column_name),
      isForeign: foreignSet.has(row.column_name),
    }));

    return { ok: true, columns };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to load columns",
    };
  }
}

async function listPostgresIndexes(payload, schema, table) {
  try {
    const result = await withClient(payload, (client) =>
      client.query(
        "SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 ORDER BY indexname",
        [schema, table],
      ),
    );

    return { ok: true, indexes: result.rows.map((row) => row.indexname) };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to load indexes",
    };
  }
}

async function executePostgresQuery(payload, sql) {
  if (!sql || !sql.trim()) {
    return { ok: false, message: "Query is empty" };
  }

  try {
    const result = await withClient(payload, (client) => client.query(sql));
    return {
      ok: true,
      rows: result.rows ?? [],
      rowCount: typeof result.rowCount === "number" ? result.rowCount : 0,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Query failed",
    };
  }
}

module.exports = {
  testPostgresConnection,
  listPostgresSchemas,
  listPostgresTables,
  listPostgresColumns,
  listPostgresIndexes,
  executePostgresQuery,
};

