---
name: new-db-migration
description: Guide for creating new database migrations in GOMP. Use this when asked to add or update database schema.
---

# New DB Migration Checklist

Use this checklist when making schema changes.

## 1) Create Migration Pair for Both Engines
- Add the next numbered migration files for PostgreSQL:
  - `db/migrations/postgres/NNNN_name.up.sql`
  - `db/migrations/postgres/NNNN_name.down.sql`
- Add equivalent migration files for SQLite:
  - `db/migrations/sqlite/NNNN_name.up.sql`
  - `db/migrations/sqlite/NNNN_name.down.sql`

## 2) Keep Behavior Equivalent
- Ensure table/column/index/constraint intent is equivalent across engines.
- Account for dialect differences explicitly and document with SQL comments where needed.

## 3) Rollback Safety
- Ensure each `.down.sql` cleanly reverses `.up.sql`.
- Avoid irreversible destructive changes unless explicitly required.

## 4) Application Compatibility
- Update DB queries and model mappings for renamed/added/removed fields.
- Confirm generated model tags and SQL scan targets still match schema.

## 5) Validate Migration Integration
- Ensure migration files remain embedded and packaged in build output.
- Run tests and any startup migration flow that exercises both migration and query paths.

## 6) Verify
- Run `make test`.
- Run `make lint`.

## Guardrails
- Do not create migrations for only one engine.
- Keep migration numbers incremental in both SQLite and PostgreSQL.
- Prefer additive, backwards-compatible migrations when practical.
