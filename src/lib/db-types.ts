const dbTypes = ["postgres", "mysql", "mssql", "sqlite"] as const;

type DbType = (typeof dbTypes)[number];

type DbTypeOption = {
  value: DbType;
  label: string;
};

const dbTypeOptions: DbTypeOption[] = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mssql", label: "SQL Server" },
  { value: "sqlite", label: "SQLite" },
];

export { dbTypes, dbTypeOptions };
export type { DbType, DbTypeOption };
