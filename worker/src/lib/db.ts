// D1 Database client wrapper with batch operation helpers
// Per Constitution Principle V (Batch Operations & Concurrency)

import { Env } from './types'

export class DatabaseClient {
  constructor(private db: D1Database) {}

  // Helper for batch operations (Constitution Principle V)
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    return await this.db.batch(statements)
  }

  // Helper for single query
  async query<T = unknown>(sql: string, ...bindings: unknown[]): Promise<T[]> {
    const stmt = this.db.prepare(sql).bind(...bindings)
    const result = await stmt.all<T>()
    return result.results
  }

  // Helper for single row
  async queryOne<T = unknown>(sql: string, ...bindings: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(sql).bind(...bindings)
    return await stmt.first<T>()
  }

  // Helper for insert/update/delete
  async exec(sql: string, ...bindings: unknown[]): Promise<D1Result> {
    const stmt = this.db.prepare(sql).bind(...bindings)
    return await stmt.run()
  }

  // Get raw D1Database for direct access
  raw(): D1Database {
    return this.db
  }
}

// Factory function to create DatabaseClient from env
export function createDatabaseClient(env: Env): DatabaseClient {
  return new DatabaseClient(env.DB)
}
