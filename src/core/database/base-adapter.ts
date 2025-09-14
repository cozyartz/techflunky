// Base Database Adapter for Multi-Database Support

import type {
  DatabaseConfig,
  QueryResult,
  TransactionContext,
  QueryOptions,
  Migration,
  TableSchema,
  DatabaseMetrics
} from './types';

export abstract class BaseDatabaseAdapter {
  protected config: DatabaseConfig;
  protected connected: boolean = false;
  protected metrics: DatabaseMetrics = {
    connectionCount: 0,
    queryCount: 0,
    averageQueryTime: 0,
    errorCount: 0,
    uptime: 0
  };

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  // Connection Management
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract ping(): Promise<boolean>;

  // Query Execution
  abstract query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  abstract queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;

  // Transaction Management
  abstract beginTransaction(): Promise<TransactionContext>;
  abstract executeTransaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T>;

  // Schema Management
  abstract createTable(schema: TableSchema): Promise<void>;
  abstract dropTable(tableName: string): Promise<void>;
  abstract alterTable(tableName: string, changes: any): Promise<void>;
  abstract getTableSchema(tableName: string): Promise<TableSchema>;
  abstract tableExists(tableName: string): Promise<boolean>;

  // Migration Support
  abstract runMigration(migration: Migration): Promise<void>;
  abstract rollbackMigration(migration: Migration): Promise<void>;
  abstract getMigrationStatus(): Promise<Migration[]>;

  // Query Builder Support
  abstract buildSelectQuery(table: string, options: QueryOptions): { sql: string; params: any[] };
  abstract buildInsertQuery(table: string, data: Record<string, any>): { sql: string; params: any[] };
  abstract buildUpdateQuery(table: string, data: Record<string, any>, where: QueryOptions['where']): { sql: string; params: any[] };
  abstract buildDeleteQuery(table: string, where: QueryOptions['where']): { sql: string; params: any[] };

  // Convenience Methods
  async insert(table: string, data: Record<string, any>): Promise<QueryResult> {
    const { sql, params } = this.buildInsertQuery(table, data);
    return this.query(sql, params);
  }

  async update(table: string, data: Record<string, any>, where: QueryOptions['where']): Promise<QueryResult> {
    const { sql, params } = this.buildUpdateQuery(table, data, where);
    return this.query(sql, params);
  }

  async delete(table: string, where: QueryOptions['where']): Promise<QueryResult> {
    const { sql, params } = this.buildDeleteQuery(table, where);
    return this.query(sql, params);
  }

  async select<T = any>(table: string, options: QueryOptions = {}): Promise<T[]> {
    const { sql, params } = this.buildSelectQuery(table, options);
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  async selectOne<T = any>(table: string, options: QueryOptions = {}): Promise<T | null> {
    const modifiedOptions = { ...options, limit: 1 };
    const results = await this.select<T>(table, modifiedOptions);
    return results.length > 0 ? results[0] : null;
  }

  async count(table: string, where?: QueryOptions['where']): Promise<number> {
    const { sql, params } = this.buildSelectQuery(table, {
      select: ['COUNT(*) as count'],
      where
    });
    const result = await this.queryOne<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  async exists(table: string, where: QueryOptions['where']): Promise<boolean> {
    const count = await this.count(table, where);
    return count > 0;
  }

  // Utility Methods
  protected startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  protected updateMetrics(queryTime: number, isError: boolean = false): void {
    this.metrics.queryCount++;
    this.metrics.averageQueryTime = (
      (this.metrics.averageQueryTime * (this.metrics.queryCount - 1) + queryTime) /
      this.metrics.queryCount
    );

    if (isError) {
      this.metrics.errorCount++;
    }
  }

  protected validateConnection(): void {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }

  protected escapeName(name: string): string {
    // Override in specific adapters for proper escaping
    return name;
  }

  protected escapeValue(value: any): any {
    // Override in specific adapters for proper escaping
    return value;
  }

  // Metrics and Health
  getMetrics(): DatabaseMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - (this.metrics.uptime || Date.now())
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; metrics: DatabaseMetrics; error?: string }> {
    try {
      const isHealthy = await this.ping();
      return {
        healthy: isHealthy,
        metrics: this.getMetrics()
      };
    } catch (error) {
      return {
        healthy: false,
        metrics: this.getMetrics(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Common SQL Generation Helpers
  protected buildWhereClause(where?: QueryOptions['where']): { sql: string; params: any[] } {
    if (!where || where.length === 0) {
      return { sql: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    where.forEach((condition, index) => {
      const paramIndex = params.length + 1;
      const field = this.escapeName(condition.field);

      switch (condition.operator) {
        case '=':
        case '!=':
        case '>':
        case '<':
        case '>=':
        case '<=':
          conditions.push(`${field} ${condition.operator} $${paramIndex}`);
          params.push(condition.value);
          break;
        case 'LIKE':
          conditions.push(`${field} LIKE $${paramIndex}`);
          params.push(condition.value);
          break;
        case 'IN':
          if (condition.values && condition.values.length > 0) {
            const placeholders = condition.values.map((_, i) => `$${paramIndex + i}`).join(', ');
            conditions.push(`${field} IN (${placeholders})`);
            params.push(...condition.values);
          }
          break;
        case 'NOT IN':
          if (condition.values && condition.values.length > 0) {
            const placeholders = condition.values.map((_, i) => `$${paramIndex + i}`).join(', ');
            conditions.push(`${field} NOT IN (${placeholders})`);
            params.push(...condition.values);
          }
          break;
        case 'IS NULL':
          conditions.push(`${field} IS NULL`);
          break;
        case 'IS NOT NULL':
          conditions.push(`${field} IS NOT NULL`);
          break;
      }
    });

    return {
      sql: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }

  protected buildOrderByClause(orderBy?: string): string {
    if (!orderBy) return '';
    return ` ORDER BY ${orderBy}`;
  }

  protected buildLimitClause(limit?: number, offset?: number): string {
    let clause = '';
    if (limit) {
      clause += ` LIMIT ${limit}`;
    }
    if (offset) {
      clause += ` OFFSET ${offset}`;
    }
    return clause;
  }

  protected buildJoinClause(joins?: QueryOptions['join']): string {
    if (!joins || joins.length === 0) return '';

    return joins.map(join => {
      const joinType = join.type.replace('FULL OUTER', 'FULL OUTER JOIN');
      return ` ${joinType} JOIN ${this.escapeName(join.table)} ON ${join.on}`;
    }).join('');
  }
}

// Factory for creating database adapters
export class DatabaseAdapterFactory {
  private static adapters: Map<string, typeof BaseDatabaseAdapter> = new Map();

  static register(type: string, adapter: typeof BaseDatabaseAdapter): void {
    this.adapters.set(type, adapter);
  }

  static create(config: DatabaseConfig): BaseDatabaseAdapter {
    const AdapterClass = this.adapters.get(config.type);
    if (!AdapterClass) {
      throw new Error(`Unsupported database type: ${config.type}. Available types: ${Array.from(this.adapters.keys()).join(', ')}`);
    }
    return new AdapterClass(config);
  }

  static getAvailableTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}

// Universal Query Builder
export class QueryBuilder<T = any> {
  private adapter: BaseDatabaseAdapter;
  private tableName: string;
  private options: QueryOptions = {};

  constructor(adapter: BaseDatabaseAdapter, table: string) {
    this.adapter = adapter;
    this.tableName = table;
  }

  select(fields: string[] = ['*']): this {
    this.options.select = fields;
    return this;
  }

  where(field: string, operator: any, value?: any): this {
    if (!this.options.where) this.options.where = [];

    if (typeof operator === 'object' && operator.operator) {
      this.options.where.push(operator);
    } else {
      this.options.where.push({ field, operator, value });
    }
    return this;
  }

  whereIn(field: string, values: any[]): this {
    if (!this.options.where) this.options.where = [];
    this.options.where.push({ field, operator: 'IN', values });
    return this;
  }

  whereNull(field: string): this {
    if (!this.options.where) this.options.where = [];
    this.options.where.push({ field, operator: 'IS NULL' });
    return this;
  }

  join(table: string, on: string, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL OUTER' = 'INNER'): this {
    if (!this.options.join) this.options.join = [];
    this.options.join.push({ table, type, on });
    return this;
  }

  leftJoin(table: string, on: string): this {
    return this.join(table, on, 'LEFT');
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.options.orderBy = `${field} ${direction}`;
    return this;
  }

  groupBy(fields: string[]): this {
    this.options.groupBy = fields;
    return this;
  }

  limit(count: number): this {
    this.options.limit = count;
    return this;
  }

  offset(count: number): this {
    this.options.offset = count;
    return this;
  }

  async execute(): Promise<T[]> {
    return this.adapter.select<T>(this.tableName, this.options);
  }

  async first(): Promise<T | null> {
    this.limit(1);
    const results = await this.execute();
    return results.length > 0 ? results[0] : null;
  }

  async count(): Promise<number> {
    return this.adapter.count(this.tableName, this.options.where);
  }

  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }
}