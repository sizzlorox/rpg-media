<!--
SYNC IMPACT REPORT
==================
Version: 0.0.0 → 1.0.0 (INITIAL CREATION)
Date: 2026-02-13

RATIONALE FOR VERSION 1.0.0:
- Initial constitution creation based on Cloudflare D1 best practices
- Establishes foundational governance principles for the project

PRINCIPLES ESTABLISHED:
1. Horizontal Database Scaling (NEW)
2. Index-First Performance (NEW)
3. Type Safety & Schema Strictness (NEW)
4. Local-First Development (NEW)
5. Batch Operations & Concurrency (NEW)
6. Migration Safety (NEW)
7. Platform Limits Awareness (NEW)

TEMPLATE CONSISTENCY STATUS:
- ✅ plan-template.md - Reviewed, compatible with constitution principles
- ✅ spec-template.md - Reviewed, no changes needed (technology-agnostic by design)
- ✅ tasks-template.md - Reviewed, compatible with constitution principles
- ⚠️  commands/*.md - Manual review recommended for D1-specific guidance references

FOLLOW-UP TODOS:
- None - All placeholders filled with concrete values
-->

# RPG Social Media Constitution

## Core Principles

### I. Horizontal Database Scaling

**Principle**: Design for multiple smaller databases rather than a single large database.

D1 is optimized for horizontal scale-out across multiple 10GB databases. This project MUST:
- Use per-user, per-tenant, or per-entity database patterns where appropriate
- Avoid consolidating all data into a single monolithic database
- Design schemas that can be replicated across database instances
- Plan for a maximum of 10GB per database (platform limit)

**Rationale**: D1's single-threaded architecture per database means that distributing data across multiple databases provides better concurrency and throughput than a single large database processing queries sequentially.

### II. Index-First Performance

**Principle**: Strategic indexing is mandatory for frequently queried columns.

All database schemas MUST:
- Create indexes for columns used in WHERE clauses (user IDs, email addresses, usernames, dates)
- Use `CREATE UNIQUE INDEX` to enforce uniqueness constraints
- Follow naming convention: `idx_TABLE_COLUMN` (e.g., `idx_users_email`)
- Run `PRAGMA optimize` after index creation to collect statistics
- Use `EXPLAIN QUERY PLAN` to verify index usage before deployment

**When to Index**:
- ✅ Columns in WHERE clauses used in 50%+ of queries
- ✅ Foreign key columns for JOIN operations
- ✅ Columns requiring uniqueness constraints
- ✅ Multi-column indexes for composite predicates (e.g., `customer_id, transaction_date`)
- ❌ Rarely queried columns (indexes add write overhead and storage cost)

**Advanced Optimization**:
- Use partial indexes with WHERE clauses to reduce index size for subset queries
- Accept that indexes cannot be modified; plan to drop and recreate when schema evolves

**Rationale**: While indexes add write overhead, the performance benefit and reduction in rows scanned nearly always offsets the additional write cost in read-heavy applications.

### III. Type Safety & Schema Strictness

**Principle**: All tables MUST use STRICT mode to prevent type mismatches.

Database schemas MUST:
- Define tables with `CREATE TABLE tablename (...) STRICT`
- Explicitly declare column types (TEXT, INTEGER, REAL, BLOB)
- Never rely on SQLite's dynamic typing in production schemas
- Validate that JavaScript types (null→NULL, Number→REAL/INTEGER, String→TEXT, Boolean→INTEGER) match schema expectations

**Type Safety Rules**:
- All query parameters MUST be defined (undefined values trigger errors)
- Use TypeScript generics with D1 client methods (e.g., `run<OrderRow>()`) to ensure type safety
- Test type conversions in local development before deployment

**Rationale**: STRICT tables prevent type mismatch issues between stored values and schema definitions, catching errors at write-time rather than read-time.

### IV. Local-First Development

**Principle**: All development and testing MUST occur in local environments before production deployment.

Development workflow MUST:
- Use `wrangler dev` to create local-only environments that mirror production
- Never test against production databases (local sessions have no production data access by default)
- Persist local data across development sessions using `wrangler dev --persist-to=/path/to/file`
- Use Miniflare for programmatic database testing via `getD1Database()` method
- Test migrations locally with `wrangler d1 execute YOUR_DATABASE_NAME --local --command`

**Data Management**:
- Reset tables with `DROP TABLE` before recreating for clean state testing
- Use shared persistence paths for team collaboration and CI/CD consistency
- For Pages development, use `preview_database_id` for local-only database access

**Rationale**: Local development protects production data, enables faster iteration cycles, and ensures migrations are validated before deployment.

### V. Batch Operations & Concurrency

**Principle**: Optimize for D1's single-threaded architecture by using batch operations and understanding concurrency limits.

Query execution MUST:
- Use `batch()` method to execute multiple statements in a single operation
- Understand that each database processes queries one at a time (1ms query = ~1,000 QPS; 100ms query = ~10 QPS)
- Respect platform limits: 1,000 queries per invocation (paid) / 50 queries (free)
- Use appropriate query methods based on needs:
  - `run()` for full D1Result with metadata
  - `raw()` for lightweight array-of-arrays responses
  - `first()` for single-record queries
  - `exec()` for raw SQL without parameters

**Concurrency Constraints**:
- Maximum 6 simultaneous connections per Worker invocation
- Maximum 30-second query execution duration
- Maximum 100 bound parameters per query
- Maximum 100KB SQL statement length

**Rationale**: D1's single-threaded design requires careful query optimization and batching to achieve acceptable throughput. Understanding these constraints prevents performance bottlenecks.

### VI. Migration Safety

**Principle**: Database migrations MUST follow strict ordering and validation rules.

Migration procedures MUST:
- Use SQL format files (`.sql` extension) only; raw SQLite dumps (`.sqlite3`) are not supported
- Follow SQLite3 syntax standards (MySQL/PostgreSQL syntax is incompatible)
- Import tables in dependency order (foreign key targets before references)
- Remove transaction control statements (`BEGIN TRANSACTION`, `COMMIT`) from import files
- Split large INSERT statements into smaller batches to respect statement size limits (100KB)
- Respect 5GB file size limit for imports

**Foreign Key Management**:
- Use `PRAGMA defer_foreign_keys = true` when import order would temporarily violate constraints
- Validate all foreign key relationships after migration completion
- Test migrations locally before production deployment

**Export Strategies**:
- Use `wrangler d1 export` with appropriate flags (full dump, single table, schema-only, data-only)
- Note that export operations block other database requests during execution

**Rationale**: Incorrect migration ordering or syntax can corrupt data or cause import failures. Following these rules ensures safe, repeatable migrations.

### VII. Platform Limits Awareness

**Principle**: Design and implement with full awareness of D1 platform limits.

Architecture decisions MUST respect:

**Account Limits**:
- 50,000 databases per account (paid) / 10 (free)
- 1TB total storage (paid) / 5GB (free)
- 10GB per database maximum (paid) / 500MB (free)

**Data Constraints**:
- 2MB maximum row/BLOB/string size
- 100 columns per table maximum
- Unlimited rows per table (subject to database storage cap)

**Operational Limits**:
- Time Travel: 30 days (paid) / 7 days (free), with 10 restores per 10 minutes per database
- ~5,000 D1 database bindings per Worker script

**Design Implications**:
- If data exceeds 10GB, partition across multiple databases (see Principle I)
- If row size exceeds 2MB, store large objects in R2 and reference in D1
- Plan for single-threaded query processing when estimating throughput

**Rationale**: Understanding platform limits prevents architectural decisions that will fail at scale. Design within constraints from day one to avoid costly refactoring.

## Database Design Standards

### Schema Requirements

All database schemas MUST:
- Use STRICT tables with explicit type definitions
- Include appropriate indexes identified during spec/plan phase
- Define foreign key relationships with ON DELETE and ON UPDATE clauses
- Use descriptive column names (snake_case convention)
- Include timestamp columns (created_at, updated_at) for audit trails

### Query Standards

All database queries MUST:
- Use prepared statements with parameter binding (never string concatenation)
- Be tested with `EXPLAIN QUERY PLAN` to verify index usage
- Include appropriate WHERE clauses to limit row scans
- Use batch operations when executing multiple statements
- Handle errors gracefully with appropriate retry logic

### Testing Requirements

All database code MUST:
- Be tested locally before production deployment
- Include unit tests using Miniflare or `unstable_dev()` API
- Validate migration scripts in local environment
- Test foreign key constraints and referential integrity
- Verify type conversions between JavaScript and SQLite types

## Development Workflow

### Pre-Implementation Checklist

Before writing database code, developers MUST:
1. Review the spec to identify entities and relationships
2. Design schema with STRICT tables and appropriate indexes
3. Identify which queries will be frequently executed (for indexing decisions)
4. Plan for horizontal scaling if data volume exceeds 10GB per entity type
5. Validate that row sizes stay under 2MB limit

### Implementation Standards

During implementation, developers MUST:
1. Write migrations as SQL files following dependency ordering
2. Test migrations locally with `--local` flag
3. Use TypeScript generics for type-safe query results
4. Implement retry logic for transient failures
5. Use batch operations for multiple related statements

### Review Standards

Code reviews MUST verify:
- All tables use STRICT mode
- Appropriate indexes exist for WHERE clause columns
- Prepared statements are used (no SQL injection vulnerabilities)
- Platform limits are respected (query count, statement size, row size)
- Local testing was performed before PR submission

## Governance

### Amendment Process

This constitution supersedes all other development practices for this project. Amendments require:
1. Documentation of proposed changes with rationale
2. Review by project maintainers
3. Migration plan for existing code if changes affect established patterns
4. Version bump following semantic versioning (see below)

### Versioning Policy

Constitution versions follow MAJOR.MINOR.PATCH format:
- **MAJOR**: Backward-incompatible governance changes or principle removals/redefinitions
- **MINOR**: New principles added or material expansion of existing guidance
- **PATCH**: Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Review

All code submissions MUST:
- Verify compliance with constitution principles during code review
- Document any deviations with explicit justification
- Reject complexity that violates stated principles without strong rationale

### Runtime Guidance

For day-to-day development decisions not covered by this constitution, developers should:
- Consult the Cloudflare D1 documentation at https://developers.cloudflare.com/d1/
- Follow TypeScript and Hono framework best practices
- Prioritize simplicity and maintainability over premature optimization

**Version**: 1.0.0 | **Ratified**: 2026-02-13 | **Last Amended**: 2026-02-13
