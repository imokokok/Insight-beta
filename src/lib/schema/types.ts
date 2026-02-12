import type { QueryResultRow, QueryResult } from 'pg';

export interface TableDefinition {
  name: string;
  sql: string;
}

export interface IndexDefinition {
  name: string;
  table: string;
  sql: string;
}

export interface MigrationDefinition {
  version: number;
  description: string;
  sql: string;
}

export type QueryFn = <T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: (string | number | boolean | string[] | number[] | Date | null | undefined)[],
) => Promise<QueryResult<T>>;
