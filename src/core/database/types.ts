// Database abstraction types for multi-database support

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'sqlite' | 'd1' | 'mongodb';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionString?: string;
  options?: Record<string, any>;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command?: string;
  oid?: number;
  fields?: Array<{
    name: string;
    dataTypeID: number;
  }>;
}

export interface TransactionContext {
  query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  rollback(): Promise<void>;
  commit(): Promise<void>;
}

export interface WhereCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS NULL' | 'IS NOT NULL';
  value?: any;
  values?: any[];
}

export interface JoinCondition {
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER';
  on: string;
}

export interface QueryOptions {
  select?: string[];
  where?: WhereCondition[];
  join?: JoinCondition[];
  orderBy?: string;
  groupBy?: string[];
  having?: WhereCondition[];
  limit?: number;
  offset?: number;
}

export interface Migration {
  version: string;
  name: string;
  up: string;
  down: string;
  timestamp: Date;
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  default?: any;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
}

export interface ConstraintDefinition {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  reference?: {
    table: string;
    columns: string[];
  };
  condition?: string;
}

export interface DatabaseMetrics {
  connectionCount: number;
  queryCount: number;
  averageQueryTime: number;
  errorCount: number;
  lastError?: string;
  uptime: number;
}