const {
  testPostgresConnection,
  listPostgresSchemas,
  listPostgresTables,
  listPostgresColumns,
  listPostgresIndexes,
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

module.exports = {
  testHandlers,
  schemaHandlers,
  tableHandlers,
  columnHandlers,
  indexHandlers,
  queryHandlers,
};
