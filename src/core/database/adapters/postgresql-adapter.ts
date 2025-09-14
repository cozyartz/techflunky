// PostgreSQL Database Adapter Implementation
// Enterprise-grade database support for TechFlunky

import { BaseDatabaseAdapter } from '../base-adapter';
import type {
  DatabaseConfig,
  QueryResult,
  TransactionContext,
  QueryOptions,
  Migration,
  TableSchema,
  ColumnDefinition,
  WhereCondition
} from '../types';

// Mock pg types (in real implementation, these would be imported from 'pg')
interface PoolClient {
  query(text: string, params?: any[]): Promise<any>;
  release(): void;
}

interface Pool {
  connect(): Promise<PoolClient>;
  query(text: string, params?: any[]): Promise<any>;
  end(): Promise<void>;
}

// PostgreSQL Transaction Context
class PostgreSQLTransactionContext implements TransactionContext {
  constructor(private client: PoolClient) {}

  async query<T>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    try {
      const result = await this.client.query(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command,
        oid: result.oid,
        fields: result.fields
      };
    } catch (error) {
      throw new Error(`Transaction query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT');
  }
}

export class PostgreSQLAdapter extends BaseDatabaseAdapter {
  private pool?: Pool;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(): Promise<void> {
    try {
      // In real implementation, this would use the 'pg' library
      // const { Pool } = require('pg');

      const connectionConfig = this.config.connectionString ? {
        connectionString: this.config.connectionString,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false
      } : {
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        ...this.config.options
      };

      // Mock pool creation - replace with actual pg.Pool in implementation
      this.pool = {
        connect: async () => ({
          query: async (text: string, params?: any[]) => ({ rows: [], rowCount: 0 }),
          release: () => {}
        } as PoolClient),
        query: async (text: string, params?: any[]) => ({ rows: [], rowCount: 0 }),
        end: async () => {}
      } as Pool;

      this.connected = true;
      this.metrics.connectionCount++;
      this.metrics.uptime = Date.now();

      console.log('PostgreSQL adapter connected successfully');
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
    this.connected = false;
  }

  async ping(): Promise<boolean> {
    try {
      this.validateConnection();
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    this.validateConnection();
    const timer = this.startTimer();

    try {
      const result = await this.pool!.query(sql, params);
      const queryTime = timer();
      this.updateMetrics(queryTime);

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command,
        oid: result.oid,
        fields: result.fields
      };
    } catch (error) {
      const queryTime = timer();
      this.updateMetrics(queryTime, true);
      this.metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async beginTransaction(): Promise<TransactionContext> {
    this.validateConnection();
    const client = await this.pool!.connect();

    try {
      await client.query('BEGIN');
      return new PostgreSQLTransactionContext(client);
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async executeTransaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pool!.connect();

    try {
      await client.query('BEGIN');
      const tx = new PostgreSQLTransactionContext(client);

      const result = await callback(tx);
      await tx.commit();

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Schema Management
  async createTable(schema: TableSchema): Promise<void> {
    const columns = schema.columns.map(col => this.buildColumnDefinition(col)).join(', ');

    let sql = `CREATE TABLE ${this.escapeName(schema.name)} (${columns}`;

    // Add constraints
    if (schema.constraints) {
      const constraints = schema.constraints.map(constraint => {
        switch (constraint.type) {
          case 'PRIMARY KEY':
            return `CONSTRAINT ${constraint.name} PRIMARY KEY (${constraint.columns.join(', ')})`;
          case 'FOREIGN KEY':
            return `CONSTRAINT ${constraint.name} FOREIGN KEY (${constraint.columns.join(', ')}) REFERENCES ${constraint.reference?.table}(${constraint.reference?.columns.join(', ')})`;
          case 'UNIQUE':
            return `CONSTRAINT ${constraint.name} UNIQUE (${constraint.columns.join(', ')})`;
          case 'CHECK':
            return `CONSTRAINT ${constraint.name} CHECK (${constraint.condition})`;
          default:
            return '';
        }
      }).filter(Boolean);

      if (constraints.length > 0) {
        sql += ', ' + constraints.join(', ');
      }
    }

    sql += ')';

    await this.query(sql);

    // Create indexes
    if (schema.indexes) {
      for (const index of schema.indexes) {
        await this.createIndex(index);
      }
    }
  }

  async dropTable(tableName: string): Promise<void> {
    await this.query(`DROP TABLE IF EXISTS ${this.escapeName(tableName)} CASCADE`);
  }

  async alterTable(tableName: string, changes: any): Promise<void> {
    // Implementation would depend on the specific changes needed
    throw new Error('alterTable not yet implemented for PostgreSQL');
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    const columnsQuery = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;

    const result = await this.query(columnsQuery, [tableName]);

    const columns: ColumnDefinition[] = result.rows.map(row => ({
      name: row.column_name,
      type: this.mapPostgreSQLType(row.data_type, row.character_maximum_length, row.numeric_precision, row.numeric_scale),
      nullable: row.is_nullable === 'YES',
      default: row.column_default,
      primaryKey: false, // Would need additional query to determine
      autoIncrement: row.column_default?.includes('nextval') || false
    }));

    return {
      name: tableName,
      columns,
      indexes: [], // Would need additional queries to get indexes
      constraints: [] // Would need additional queries to get constraints
    };
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.queryOne(
      'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
      [tableName]
    );
    return result?.exists || false;
  }

  // Migration Support
  async runMigration(migration: Migration): Promise<void> {
    await this.executeTransaction(async (tx) => {
      // Run the migration
      await tx.query(migration.up);

      // Record the migration
      await tx.query(
        'INSERT INTO migrations (version, name, executed_at) VALUES ($1, $2, NOW())',
        [migration.version, migration.name]
      );
    });
  }

  async rollbackMigration(migration: Migration): Promise<void> {
    await this.executeTransaction(async (tx) => {
      // Run the rollback
      await tx.query(migration.down);

      // Remove migration record
      await tx.query(
        'DELETE FROM migrations WHERE version = $1',
        [migration.version]
      );
    });
  }

  async getMigrationStatus(): Promise<Migration[]> {
    // Ensure migrations table exists
    await this.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await this.query(
      'SELECT version, name, executed_at FROM migrations ORDER BY executed_at'
    );

    return result.rows.map(row => ({
      version: row.version,
      name: row.name,
      up: '', // Not stored in DB
      down: '', // Not stored in DB
      timestamp: new Date(row.executed_at)
    }));
  }

  // Query Builder Implementation
  buildSelectQuery(table: string, options: QueryOptions): { sql: string; params: any[] } {
    const select = options.select ? options.select.join(', ') : '*';
    let sql = `SELECT ${select} FROM ${this.escapeName(table)}`;
    let params: any[] = [];

    // Add JOINs
    if (options.join) {
      sql += this.buildJoinClause(options.join);
    }

    // Add WHERE clause
    const whereClause = this.buildWhereClause(options.where);
    sql += whereClause.sql;
    params.push(...whereClause.params);

    // Add GROUP BY
    if (options.groupBy && options.groupBy.length > 0) {
      sql += ` GROUP BY ${options.groupBy.join(', ')}`;
    }

    // Add HAVING
    if (options.having) {
      const havingClause = this.buildWhereClause(options.having);
      sql += havingClause.sql.replace(' WHERE ', ' HAVING ');
      params.push(...havingClause.params);
    }

    // Add ORDER BY
    sql += this.buildOrderByClause(options.orderBy);

    // Add LIMIT and OFFSET
    sql += this.buildLimitClause(options.limit, options.offset);

    return { sql, params };
  }

  buildInsertQuery(table: string, data: Record<string, any>): { sql: string; params: any[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const sql = `INSERT INTO ${this.escapeName(table)} (${columns.map(col => this.escapeName(col)).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

    return { sql, params: values };
  }

  buildUpdateQuery(table: string, data: Record<string, any>, where?: WhereCondition[]): { sql: string; params: any[] } {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${this.escapeName(col)} = $${index + 1}`).join(', ');

    let sql = `UPDATE ${this.escapeName(table)} SET ${setClause}`;
    let params = [...values];

    if (where) {
      const whereClause = this.buildWhereClause(where);
      // Adjust parameter indices for WHERE clause
      const adjustedWhereSQL = whereClause.sql.replace(/\$(\d+)/g, (match, num) => {
        return `$${parseInt(num) + values.length}`;
      });
      sql += adjustedWhereSQL;
      params.push(...whereClause.params);
    }

    sql += ' RETURNING *';

    return { sql, params };
  }

  buildDeleteQuery(table: string, where?: WhereCondition[]): { sql: string; params: any[] } {
    let sql = `DELETE FROM ${this.escapeName(table)}`;
    let params: any[] = [];

    if (where) {
      const whereClause = this.buildWhereClause(where);
      sql += whereClause.sql;
      params = whereClause.params;
    }

    return { sql, params };
  }

  // Helper Methods
  protected escapeName(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  private buildColumnDefinition(column: ColumnDefinition): string {
    let definition = `${this.escapeName(column.name)} ${column.type}`;

    if (column.primaryKey) {
      definition += ' PRIMARY KEY';
    }

    if (column.autoIncrement) {
      definition += ' GENERATED ALWAYS AS IDENTITY';
    }

    if (!column.nullable) {
      definition += ' NOT NULL';
    }

    if (column.unique) {
      definition += ' UNIQUE';
    }

    if (column.default !== undefined) {
      definition += ` DEFAULT ${column.default}`;
    }

    if (column.references) {
      definition += ` REFERENCES ${this.escapeName(column.references.table)}(${this.escapeName(column.references.column)})`;

      if (column.references.onDelete) {
        definition += ` ON DELETE ${column.references.onDelete}`;
      }

      if (column.references.onUpdate) {
        definition += ` ON UPDATE ${column.references.onUpdate}`;
      }
    }

    return definition;
  }

  private async createIndex(index: any): Promise<void> {
    const uniqueClause = index.unique ? 'UNIQUE ' : '';
    const typeClause = index.type ? ` USING ${index.type}` : '';
    const columnsClause = index.columns.join(', ');

    const sql = `CREATE ${uniqueClause}INDEX ${index.name} ON ${this.escapeName(index.table)}${typeClause} (${columnsClause})`;
    await this.query(sql);
  }

  private mapPostgreSQLType(dataType: string, maxLength?: number, precision?: number, scale?: number): string {
    switch (dataType.toLowerCase()) {
      case 'character varying':
      case 'varchar':
        return maxLength ? `VARCHAR(${maxLength})` : 'VARCHAR';
      case 'character':
      case 'char':
        return maxLength ? `CHAR(${maxLength})` : 'CHAR';
      case 'text':
        return 'TEXT';
      case 'integer':
        return 'INTEGER';
      case 'bigint':
        return 'BIGINT';
      case 'smallint':
        return 'SMALLINT';
      case 'numeric':
      case 'decimal':
        return precision && scale ? `DECIMAL(${precision},${scale})` : 'DECIMAL';
      case 'real':
        return 'REAL';
      case 'double precision':
        return 'DOUBLE PRECISION';
      case 'boolean':
        return 'BOOLEAN';
      case 'date':
        return 'DATE';
      case 'time':
        return 'TIME';
      case 'timestamp':
      case 'timestamp without time zone':
        return 'TIMESTAMP';
      case 'timestamp with time zone':
        return 'TIMESTAMPTZ';
      case 'uuid':
        return 'UUID';
      case 'json':
        return 'JSON';
      case 'jsonb':
        return 'JSONB';
      default:
        return dataType.toUpperCase();
    }
  }
}