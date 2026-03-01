export const PG_KEYWORDS = [
  // Standard
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
  'INNER JOIN', 'FULL OUTER JOIN', 'CROSS JOIN',
  'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'TRUNCATE',
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ILIKE', 'BETWEEN',
  'IS NULL', 'IS NOT NULL', 'EXISTS', 'DISTINCT', 'AS',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
  'WITH', 'RETURNING',

  // PostgreSQL specific
  'RETURNING',
  'ON CONFLICT', 'DO NOTHING', 'DO UPDATE',
  'LATERAL',
  'FILTER',
  'OVER', 'PARTITION BY',
  'WINDOW',
  'GENERATED ALWAYS AS',
  'NULLS FIRST', 'NULLS LAST',
  'ASC', 'DESC',
  'EXPLAIN', 'EXPLAIN ANALYZE',
  'VACUUM', 'ANALYZE',
  'COPY',
  'LISTEN', 'NOTIFY',
];


export const PG_FUNCTIONS = [
  // Aggregate
  { label: 'COUNT', insertText: 'COUNT(${1:*})', detail: '→ bigint' },
  { label: 'SUM', insertText: 'SUM(${1:expr})', detail: '→ numeric' },
  { label: 'AVG', insertText: 'AVG(${1:expr})', detail: '→ numeric' },
  { label: 'MAX', insertText: 'MAX(${1:expr})', detail: '→ same type' },
  { label: 'MIN', insertText: 'MIN(${1:expr})', detail: '→ same type' },
  { label: 'ARRAY_AGG', insertText: 'ARRAY_AGG(${1:expr})', detail: '→ array' },
  { label: 'STRING_AGG', insertText: "STRING_AGG(${1:expr}, '${2:,}')", detail: '→ text' },
  { label: 'JSON_AGG', insertText: 'JSON_AGG(${1:expr})', detail: '→ json' },
  { label: 'JSONB_AGG', insertText: 'JSONB_AGG(${1:expr})', detail: '→ jsonb' },
  { label: 'BOOL_AND', insertText: 'BOOL_AND(${1:expr})', detail: '→ boolean' },
  { label: 'BOOL_OR', insertText: 'BOOL_OR(${1:expr})', detail: '→ boolean' },

  // Window
  { label: 'ROW_NUMBER', insertText: 'ROW_NUMBER() OVER (${1:partition})', detail: 'Window function' },
  { label: 'RANK', insertText: 'RANK() OVER (${1:partition})', detail: 'Window function' },
  { label: 'DENSE_RANK', insertText: 'DENSE_RANK() OVER (${1:partition})', detail: 'Window function' },
  { label: 'LAG', insertText: 'LAG(${1:expr}, ${2:1}) OVER (${3:partition})', detail: 'Window function' },
  { label: 'LEAD', insertText: 'LEAD(${1:expr}, ${2:1}) OVER (${3:partition})', detail: 'Window function' },
  { label: 'FIRST_VALUE', insertText: 'FIRST_VALUE(${1:expr}) OVER (${2:partition})', detail: 'Window function' },
  { label: 'LAST_VALUE', insertText: 'LAST_VALUE(${1:expr}) OVER (${2:partition})', detail: 'Window function' },
  { label: 'NTILE', insertText: 'NTILE(${1:n}) OVER (${2:partition})', detail: 'Window function' },

  // String
  { label: 'CONCAT', insertText: 'CONCAT(${1:str1}, ${2:str2})', detail: '→ text' },
  { label: 'UPPER', insertText: 'UPPER(${1:text})', detail: '→ text' },
  { label: 'LOWER', insertText: 'LOWER(${1:text})', detail: '→ text' },
  { label: 'TRIM', insertText: 'TRIM(${1:text})', detail: '→ text' },
  { label: 'LTRIM', insertText: 'LTRIM(${1:text})', detail: '→ text' },
  { label: 'RTRIM', insertText: 'RTRIM(${1:text})', detail: '→ text' },
  { label: 'LENGTH', insertText: 'LENGTH(${1:text})', detail: '→ int' },
  { label: 'SUBSTRING', insertText: 'SUBSTRING(${1:text} FROM ${2:1} FOR ${3:5})', detail: '→ text' },
  { label: 'REPLACE', insertText: 'REPLACE(${1:text}, ${2:from}, ${3:to})', detail: '→ text' },
  { label: 'SPLIT_PART', insertText: "SPLIT_PART(${1:text}, '${2:,}', ${3:1})", detail: '→ text' },
  { label: 'REGEXP_MATCH', insertText: "REGEXP_MATCH(${1:text}, '${2:pattern}')", detail: '→ text[]' },
  { label: 'REGEXP_REPLACE', insertText: "REGEXP_REPLACE(${1:text}, '${2:pattern}', '${3:replacement}')", detail: '→ text' },
  { label: 'FORMAT', insertText: "FORMAT('${1:%s}', ${2:arg})", detail: '→ text' },
  { label: 'LPAD', insertText: 'LPAD(${1:text}, ${2:length}, ${3: })', detail: '→ text' },
  { label: 'RPAD', insertText: 'RPAD(${1:text}, ${2:length}, ${3: })', detail: '→ text' },

  // Date/Time
  { label: 'NOW', insertText: 'NOW()', detail: '→ timestamptz' },
  { label: 'CURRENT_DATE', insertText: 'CURRENT_DATE', detail: '→ date' },
  { label: 'CURRENT_TIME', insertText: 'CURRENT_TIME', detail: '→ timetz' },
  { label: 'CURRENT_TIMESTAMP', insertText: 'CURRENT_TIMESTAMP', detail: '→ timestamptz' },
  { label: 'DATE_TRUNC', insertText: "DATE_TRUNC('${1:day}', ${2:timestamp})", detail: '→ timestamp' },
  { label: 'DATE_PART', insertText: "DATE_PART('${1:epoch}', ${2:timestamp})", detail: '→ float8' },
  { label: 'EXTRACT', insertText: "EXTRACT(${1:YEAR} FROM ${2:timestamp})", detail: '→ numeric' },
  { label: 'AGE', insertText: 'AGE(${1:timestamp1}, ${2:timestamp2})', detail: '→ interval' },
  { label: 'TO_TIMESTAMP', insertText: "TO_TIMESTAMP(${1:text}, '${2:YYYY-MM-DD}')", detail: '→ timestamptz' },
  { label: 'TO_DATE', insertText: "TO_DATE('${1:text}', '${2:YYYY-MM-DD}')", detail: '→ date' },
  { label: 'MAKE_DATE', insertText: 'MAKE_DATE(${1:year}, ${2:month}, ${3:day})', detail: '→ date' },
  { label: 'INTERVAL', insertText: "INTERVAL '${1:1 day}'", detail: 'interval literal' },

  // JSON / JSONB
  { label: 'TO_JSON', insertText: 'TO_JSON(${1:value})', detail: '→ json' },
  { label: 'TO_JSONB', insertText: 'TO_JSONB(${1:value})', detail: '→ jsonb' },
  { label: 'JSON_BUILD_OBJECT', insertText: "JSON_BUILD_OBJECT('${1:key}', ${2:value})", detail: '→ json' },
  { label: 'JSONB_BUILD_OBJECT', insertText: "JSONB_BUILD_OBJECT('${1:key}', ${2:value})", detail: '→ jsonb' },
  { label: 'JSON_ARRAY_LENGTH', insertText: 'JSON_ARRAY_LENGTH(${1:json})', detail: '→ int' },
  { label: 'JSONB_SET', insertText: "JSONB_SET(${1:target}, '{${2:key}}', ${3:value})", detail: '→ jsonb' },
  { label: 'JSON_EXTRACT_PATH', insertText: "JSON_EXTRACT_PATH(${1:json}, '${2:key}')", detail: '→ json' },

  // Type casting / conversion
  { label: 'CAST', insertText: 'CAST(${1:value} AS ${2:type})', detail: 'Type cast' },
  { label: 'COALESCE', insertText: 'COALESCE(${1:value1}, ${2:value2})', detail: 'First non-null' },
  { label: 'NULLIF', insertText: 'NULLIF(${1:value1}, ${2:value2})', detail: 'NULL if equal' },
  { label: 'GREATEST', insertText: 'GREATEST(${1:val1}, ${2:val2})', detail: 'Max of list' },
  { label: 'LEAST', insertText: 'LEAST(${1:val1}, ${2:val2})', detail: 'Min of list' },
  { label: 'TO_CHAR', insertText: "TO_CHAR(${1:value}, '${2:FM9999}')", detail: '→ text' },
  { label: 'TO_NUMBER', insertText: "TO_NUMBER('${1:text}', '${2:9999}')", detail: '→ numeric' },

  // Array
  { label: 'ARRAY_LENGTH', insertText: 'ARRAY_LENGTH(${1:array}, ${2:1})', detail: '→ int' },
  { label: 'ARRAY_APPEND', insertText: 'ARRAY_APPEND(${1:array}, ${2:element})', detail: '→ array' },
  { label: 'ARRAY_PREPEND', insertText: 'ARRAY_PREPEND(${1:element}, ${2:array})', detail: '→ array' },
  { label: 'UNNEST', insertText: 'UNNEST(${1:array})', detail: 'Expand array to rows' },
  { label: 'ARRAY_TO_STRING', insertText: "ARRAY_TO_STRING(${1:array}, '${2:,}')", detail: '→ text' },

  // Math
  { label: 'ABS', insertText: 'ABS(${1:value})', detail: '→ numeric' },
  { label: 'ROUND', insertText: 'ROUND(${1:value}, ${2:decimal})', detail: '→ numeric' },
  { label: 'CEIL', insertText: 'CEIL(${1:value})', detail: '→ numeric' },
  { label: 'FLOOR', insertText: 'FLOOR(${1:value})', detail: '→ numeric' },
  { label: 'RANDOM', insertText: 'RANDOM()', detail: '→ float8 [0,1)' },
  { label: 'GENERATE_SERIES', insertText: 'GENERATE_SERIES(${1:start}, ${2:stop}, ${3:step})', detail: 'Generate rows' },
];

export const PG_TYPES = [
  'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL',
  'NUMERIC', 'DECIMAL', 'REAL', 'DOUBLE PRECISION',
  'TEXT', 'VARCHAR', 'CHAR', 'BPCHAR',
  'BOOLEAN',
  'DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ', 'INTERVAL',
  'JSON', 'JSONB',
  'UUID',
  'ARRAY',
  'BYTEA',
  'INET', 'CIDR', 'MACADDR',
  'TSVECTOR', 'TSQUERY',
  'OID', 'REGCLASS',
  'POINT', 'LINE', 'POLYGON',
];