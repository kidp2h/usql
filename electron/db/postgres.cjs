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
        `SELECT 
          s.schema_name, 
          (SELECT count(*) FROM information_schema.tables t WHERE t.table_schema = s.schema_name AND t.table_type = 'BASE TABLE') as table_count
        FROM information_schema.schemata s 
        WHERE s.schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') 
          AND s.schema_name NOT LIKE 'pg_temp_%' 
          AND s.schema_name NOT LIKE 'pg_toast_temp_%' 
        ORDER BY s.schema_name`,
      ),
    );

    return {
      ok: true,
      schemas: result.rows.map((row) => ({
        name: row.schema_name,
        tableCount: Number(row.table_count || 0),
      })),
    };
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
        `SELECT 
          t.table_name, 
          pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) as total_bytes,
          (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as column_count,
          (SELECT count(*) FROM pg_indexes i WHERE i.schemaname = t.table_schema AND i.tablename = t.table_name) as index_count
        FROM information_schema.tables t 
        WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE' 
        ORDER BY t.table_name`,
        [schema],
      ),
    );

    return {
      ok: true,
      tables: result.rows.map((row) => ({
        name: row.table_name,
        size: Number(row.total_bytes || 0),
        columnCount: Number(row.column_count || 0),
        indexCount: Number(row.index_count || 0),
      })),
    };
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
          `SELECT 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name 
          FROM information_schema.table_constraints tc 
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema 
          JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2`,
          [schema, table],
        );

        return Promise.all([columnsPromise, primaryPromise, foreignPromise]);
      },
    );

    const primarySet = new Set(
      primaryResult.rows.map((row) => row.column_name),
    );
    const foreignMap = new Map(
      foreignResult.rows.map((row) => [
        row.column_name,
        row.foreign_table_name,
      ]),
    );

    const columns = columnsResult.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      isPrimary: primarySet.has(row.column_name),
      isForeign: foreignMap.has(row.column_name),
      references: foreignMap.get(row.column_name),
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

async function listPostgresFullMetadata(payload) {
  try {
    return await withClient(payload, async (client) => {
      // 1. Fetch schemas and table counts
      const schemasResult = await client.query(
        `SELECT 
          s.schema_name, 
          (SELECT count(*) FROM information_schema.tables t WHERE t.table_schema = s.schema_name AND t.table_type = 'BASE TABLE') as table_count
        FROM information_schema.schemata s 
        WHERE s.schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') 
          AND s.schema_name NOT LIKE 'pg_temp_%' 
          AND s.schema_name NOT LIKE 'pg_toast_temp_%' 
        ORDER BY s.schema_name`,
      );

      const schemas = schemasResult.rows;
      const fullMetadata = [];

      for (const schemaRow of schemas) {
        const schemaName = schemaRow.schema_name;

        // 2. Fetch tables for this schema
        const tablesResult = await client.query(
          `SELECT 
            t.table_name, 
            pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) as total_bytes,
            (SELECT count(*) FROM information_schema.columns c WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) as column_count,
            (SELECT count(*) FROM pg_indexes i WHERE i.schemaname = t.table_schema AND i.tablename = t.table_name) as index_count
          FROM information_schema.tables t 
          WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE' 
          ORDER BY t.table_name`,
          [schemaName],
        );

        const tables = [];
        for (const tableRow of tablesResult.rows) {
          const tableName = tableRow.table_name;

          // 3. Fetch columns, primary keys, and foreign keys in batch for this table
          const columnsPromise = client.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
            [schemaName, tableName],
          );
          const primaryPromise = client.query(
            "SELECT a.attname AS column_name FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey) WHERE i.indisprimary AND n.nspname = $1 AND c.relname = $2",
            [schemaName, tableName],
          );
          const foreignPromise = client.query(
            `SELECT 
              kcu.column_name, 
              ccu.table_name AS foreign_table_name 
            FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema 
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1 AND tc.table_name = $2`,
            [schemaName, tableName],
          );

          // 4. Fetch indexes
          const indexesPromise = client.query(
            "SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 ORDER BY indexname",
            [schemaName, tableName],
          );

          const [colsRes, primRes, forRes, idxRes] = await Promise.all([
            columnsPromise,
            primaryPromise,
            foreignPromise,
            indexesPromise,
          ]);

          const primarySet = new Set(primRes.rows.map((r) => r.column_name));
          const foreignMap = new Map(
            forRes.rows.map((r) => [r.column_name, r.foreign_table_name]),
          );

          tables.push({
            name: tableName,
            size: Number(tableRow.total_bytes || 0),
            columnCount: Number(tableRow.column_count || 0),
            indexCount: Number(tableRow.index_count || 0),
            columns: colsRes.rows.map((row) => ({
              name: row.column_name,
              dataType: row.data_type,
              isPrimary: primarySet.has(row.column_name),
              isForeign: foreignMap.has(row.column_name),
              references: foreignMap.get(row.column_name),
            })),
            indexes: idxRes.rows.map((row) => row.indexname),
          });
        }

        fullMetadata.push({
          name: schemaName,
          tableCount: Number(schemaRow.table_count || 0),
          tables,
        });
      }

      return { ok: true, metadata: fullMetadata };
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Failed to load full metadata",
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
  listPostgresFullMetadata,
  executePostgresQuery,
};

