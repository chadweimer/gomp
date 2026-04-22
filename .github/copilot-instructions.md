# Copilot Instructions for GOMP

## Project Overview
GOMP is a recipe book and meal planning application. The backend is Go, the frontend is a StencilJS app, and the project is built and deployed as a single binary that serves both API and static assets.

## Architecture and Flow
- HTTP requests enter through middleware in the main server setup.
- API routing is generated from OpenAPI using oapi-codegen strict handlers.
- Business logic is implemented in the `api` package on `apiHandler` methods.
- Data access goes through the `db.Driver` interface and its child driver interfaces.
- Frontend API client types are generated from the same OpenAPI schema.

## Source of Truth and Code Generation
OpenAPI specs are the source of truth for API shape and generated models.

- Edit `openapi.yaml` and `models.yaml` first.
- Run `make codegen` to regenerate server routes, shared models, mocks, and frontend generated client code.
- Never hand-edit generated files.

Generated files include:
- `api/routes.gen.go`
- `models/models.gen.go`
- `mocks/db/mocks.gen.go`
- `mocks/upload/mocks.gen.go`
- `static/src/generated/*`

## Core Conventions
- Logging:
  - Use structured logging with `slog`.
  - Retrieve request loggers from context with `middleware.GetLoggerFromContext(ctx)`.
- Database access:
  - Use the `db.Driver` interface from API handlers.
  - Do not couple `api` package code to concrete DB implementations.
- Error handling:
  - Use API error helpers and write HTTP errors through shared response helpers.
- Auth:
  - JWT bearer authentication with access-level scopes.
  - Current user data is placed in request context by middleware.

## Common Workflows

### Add a New API Endpoint
1. Update endpoint and schema definitions in `openapi.yaml` and, when needed, `models.yaml`.
2. Run `make codegen`.
3. Implement the new strict handler method in the appropriate `api/*.go` file.
4. Add or update tests in the matching `*_test.go` files.
5. Run `make test` and `make lint`.

### Add a Database Migration
1. Create the next numbered migration pair for both engines:
   - `db/migrations/sqlite/*.up.sql` and `*.down.sql`
   - `db/migrations/postgres/*.up.sql` and `*.down.sql`
2. Keep schema changes functionally equivalent across both engines.
3. Ensure migration embeds and packaging continue to include new files.
4. Run tests after migration changes.

### Regenerate Mocks
Run:
- `go generate ./...`

## Build, Run, and Validate
Use these commands from repository root:
- `make install`
- `make codegen`
- `make test`
- `make lint`
- `make run`

## Editing Guidance for AI Agents
- Prefer minimal, targeted edits.
- Preserve existing package boundaries and naming conventions.
- Do not reformat unrelated files.
- When adding fields to models, confirm impacts in DB code, API handlers, tests, and frontend generated types.
