const dbTypes = ["postgres", "mysql", "mssql", "sqlite"] as const;

type DbType = (typeof dbTypes)[number];

type DbTypeOption = {
  value: DbType;
  label: string;
  disabled?: boolean;
};

const dbTypeOptions: DbTypeOption[] = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL", disabled: true },
  { value: "mssql", label: "SQL Server", disabled: true },
  { value: "sqlite", label: "SQLite", disabled: true },
];

export { dbTypes, dbTypeOptions };
export type { DbType, DbTypeOption };
