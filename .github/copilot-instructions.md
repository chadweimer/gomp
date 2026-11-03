# Copilot Instructions for GOMP

All development guidelines, architecture definitions, commands, conventions, and workflows are centrally maintained in [AGENTS.md](../AGENTS.md) and the specialized skills in [`.agents/skills/`](../.agents/skills/).

Please refer to [`AGENTS.md`](../AGENTS.md) as the single source of truth for:
- **Dev Container Execution**: All toolchains (Go, Node.js, CLI utilities) run inside the Dev Container. Prefix commands with `devcontainer exec --workspace-folder . <COMMAND>`.
- **Project Architecture**: Go backend at repository root; Lit 3, TypeScript, Vite, and Ionic 9 frontend in `static/`.
- **Contract-First API**: All API models and routes originate in `openapi.yaml` and `models.yaml`.
- **Generated Code**: `*.gen.*` files (`*.gen.go`, `*.gen.ts`) are gitignored and generated dynamically during builds or via `make codegen`. Never hand-edit or commit them.
- **Common Commands**: Run `make codegen`, `make lint`, `make test`, and `make build` via the Dev Container.
- **Core Conventions & Skills**: See `.agents/skills/` for checklists covering new endpoints, database migrations, frontend components, and tests.
