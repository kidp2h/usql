const {
  testPostgresConnection,
  listPostgresSchemas,
  listPostgresTables,
  listPostgresColumns,
  listPostgresIndexes,
  listPostgresFullMetadata,
  executePostgresQuery,
} = require("./postgres.cjs");

const testHandlers = {
  postgres: testPostgresConnection,
};

const schemaHandlers = {
  postgres: listPostgresSchemas,
};

const tableHandlers = {
  postgres: listPostgresTables,
};

const columnHandlers = {
  postgres: listPostgresColumns,
};

const indexHandlers = {
  postgres: listPostgresIndexes,
};

const queryHandlers = {
  postgres: executePostgresQuery,
};

const fullMetadataHandlers = {
  postgres: listPostgresFullMetadata,
};

module.exports = {
  testHandlers,
  schemaHandlers,
  tableHandlers,
  columnHandlers,
  indexHandlers,
  queryHandlers,
  fullMetadataHandlers,
};

