const {
  testHandlers,
  schemaHandlers,
  tableHandlers,
  columnHandlers,
  indexHandlers,
  queryHandlers,
  fullMetadataHandlers,
} = require("../db/handlers.cjs");

function registerDbHandlers(ipcMain) {
  ipcMain.handle("test-connection", async (_event, payload) => {
    if (!payload || !payload.dbType) {
      return { ok: false, message: "Missing database type" };
    }

    const handler = testHandlers[payload.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload);
  });

  ipcMain.handle("get-schemas", async (_event, payload) => {
    if (!payload || !payload.dbType) {
      return { ok: false, message: "Missing database type" };
    }

    const handler = schemaHandlers[payload.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload);
  });

  ipcMain.handle("get-tables", async (_event, payload) => {
    if (!payload || !payload.connection || !payload.schema) {
      return { ok: false, message: "Missing table request payload" };
    }

    const handler = tableHandlers[payload.connection.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload.connection, payload.schema);
  });

  ipcMain.handle("get-columns", async (_event, payload) => {
    if (!payload || !payload.connection || !payload.schema || !payload.table) {
      return { ok: false, message: "Missing column request payload" };
    }

    const handler = columnHandlers[payload.connection.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload.connection, payload.schema, payload.table);
  });

  ipcMain.handle("get-indexes", async (_event, payload) => {
    if (!payload || !payload.connection || !payload.schema || !payload.table) {
      return { ok: false, message: "Missing index request payload" };
    }

    const handler = indexHandlers[payload.connection.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload.connection, payload.schema, payload.table);
  });

  ipcMain.handle("execute-query", async (_event, payload) => {
    if (!payload || !payload.dbType || !payload.sql) {
      return { ok: false, message: "Missing query payload" };
    }

    const handler = queryHandlers[payload.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload, payload.sql);
  });

  ipcMain.handle("get-full-metadata", async (_event, payload) => {
    if (!payload || !payload.dbType) {
      return { ok: false, message: "Missing database type" };
    }

    const handler = fullMetadataHandlers[payload.dbType];
    if (!handler) {
      return { ok: false, message: "Unsupported database type" };
    }

    return handler(payload);
  });
}

module.exports = { registerDbHandlers };
