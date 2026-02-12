const { createConnection } = require('vscode-languageserver/node');
const SQLLanguageServer = require('sql-language-server');

/**
 * Tạo SQL Language Server với IPC transport
 * @param {object} ipcTransport - { reader, writer } từ IPC
 * @param {object} config - Configuration cho SQL LSP
 */
function createSQLLanguageServer(ipcTransport, config = {}) {
  console.log('[SQL LSP] Initializing sql-language-server...');

  // Create connection với IPC transport
  const connection = createConnection(
    ipcTransport.reader,
    ipcTransport.writer
  );

  // Configuration cho SQL Language Server
  const serverConfig = {
    // Database connections (optional)
    connections: config.connections || [],
    
    // SQL dialect: mysql, postgres, sqlite3, mssql, generic
    dialect: config.dialect || 'postgres',
    
    // Lint rules
    lint: {
      rules: {
        'align-column-to-the-first': 'off',
        'reserved-word-case': ['error', 'upper'],
        'linebreaks': 'off',
        'indent': ['error', 2],
      },
    },
  };

  // Start SQL Language Server
  try {
    const _c = SQLLanguageServer.createServerWithConnection(connection, false);
    console.log(_c);

    console.log('[SQL LSP] sql-language-server started successfully');
    console.log('[SQL LSP] Dialect:', serverConfig.dialect);
    console.log('[SQL LSP] Connections:', serverConfig.connections.length);
  } catch (error) {
    console.error('[SQL LSP] Failed to start server:', error);
    throw error;
  }

  return connection;
}

module.exports = { createSQLLanguageServer };