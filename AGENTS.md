# Repository Guidelines & Command Execution

## Dev Container Execution
This repository relies on a Dev Container for all development toolchains (Go, Node.js, CLI utilities, etc.). Do not assume development tools are installed on the host.

- When executing terminal commands (such as builds, tests, linting, database migrations, or running scripts), verify whether the agent environment has the necessary development tools.
- If operating from an environment without the necessary development tools, always prefix commands with:
  ```bash
  devcontainer exec --workspace-folder . <COMMAND>
  ```
  or run multi-command pipelines inside `devcontainer exec --workspace-folder . sh -c '<COMMANDS>'`.
- If the dev container is not already running, it can be started with:
  ```bash
  devcontainer up --workspace-folder .
  ```
- Direct file reads, file edits, and git status checks may still be performed against the workspace files directly on disk.

## Architecture & Layout
- **Backend**: Go service located at repository root (`github.com/chadweimer/gomp`).
- **Frontend**: Located in `static/` (Lit, TypeScript, Ionic components, Vite). Uses `pnpm` as the package manager.
- **Contract-First API**: All API models and routes originate in `openapi.yaml` and `models.yaml`.
- **Generated Code**: Never directly modify `*.gen.*` files (`*.gen.go`, `*.gen.ts`). They are gitignored and generated dynamically during builds or via `make codegen`. Do not commit them.
- **Database Abstraction**: Supports both **PostgreSQL** and **SQLite** via `db.Driver`. Symmetrical migrations and dialect handling are required.

## Core Conventions
- **Logging**: Use structured logging with `slog`. Retrieve request loggers from context via `middleware.GetLoggerFromContext(ctx)`.
- **Database Access**: Always access data via `db.Driver` interfaces; never couple API handlers to concrete DB drivers.
- **API Handlers**: Implement generated strict handler methods returning generated response types.
- **Targeted Edits**: Prefer minimal, targeted changes. Maintain existing package boundaries and avoid reformatting unrelated code.

## Common Commands (Run via Dev Container)
- `make codegen` – Regenerates API routes, models, mocks, and frontend schema helpers.
- `make lint` – Runs Go linter checks (`go vet`, `revive`, `gosec`) and frontend ESLint (`pnpm --dir static run lint`).
- `make test` – Runs Go tests (`go test`) and frontend tests (`vitest`).
- `make build` – Compiles static assets and the Go binary into `build/`.

## CI & Pre-Flight Verification
GitHub Actions CI enforces that all linting, tests, and builds succeed. Before concluding changes, verify:
1. `make lint`
2. `make test`
3. `make build`

## Repository Skills
Consult specialized skills located in `.agents/skills/`:
- `fullstack-feature-checklist`: End-to-end orchestration checklist for features spanning backend and frontend.
- `new-api-endpoint`: Checklist and guide for adding or updating API endpoints.
- `new-db-migration`: Checklist for schema migrations across SQLite and PostgreSQL.
- `frontend-components`: Guide for creating Lit and Ionic page vs. leaf components and store binding.
- `writing-tests`: Patterns for Go table-driven tests, SQL mocks, and Lit component tests.
