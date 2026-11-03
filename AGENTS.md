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
- **Generated Code**: Never directly modify `*.gen.go` or `*.gen.ts` files. Run `make codegen` after updating schemas or Go interfaces.
- **Database Abstraction**: Supports both **PostgreSQL** and **SQLite** via `db.Driver`. Symmetrical migrations and dialect handling are required.

## Common Commands (Run via Dev Container)
- `make codegen` – Regenerates API routes, models, mocks, and frontend schema helpers.
- `make lint` – Runs Go linter checks (`go vet`, `revive`, `gosec`) and frontend ESLint (`pnpm --dir static run lint`).
- `make test` – Runs Go tests (`go test`) and frontend tests (`vitest`).
- `make build` – Compiles static assets and the Go binary into `build/`.

## Repository Skills
Consult specialized skills located in `.agents/skills/`:
- `fullstack-feature-checklist`: End-to-end orchestration checklist for features spanning backend and frontend.
- `new-api-endpoint`: Checklist and guide for adding or updating API endpoints.
- `new-db-migration`: Checklist for schema migrations across SQLite and PostgreSQL.
- `frontend-components`: Guide for creating Lit and Ionic page vs. leaf components and store binding.
- `writing-tests`: Patterns for Go table-driven tests, SQL mocks, and Lit component tests.
