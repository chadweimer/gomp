---
name: fullstack-feature-checklist
description: End-to-end orchestration checklist for implementing features spanning both frontend and backend in GOMP.
---

# Full-Stack Feature Checklist

Use this checklist when implementing features that touch both backend APIs and frontend UI components. Follow this step-by-step order of operations to ensure contract integrity and avoid rework.

---

## Step 1: Define API Contract & Schemas
- Update `openapi.yaml` for endpoints, parameters, request bodies, and response types.
- Update `models.yaml` if introducing shared entities or domain types.
- **Reference**: Follow the [new-api-endpoint](../new-api-endpoint/SKILL.md) skill.

## Step 2: Regenerate Code
- Run `make codegen` inside the dev container.
- Verify generated outputs (note: `*.gen.*` files are gitignored and not committed):
  - `api/routes.gen.go`
  - `models/models.gen.go`
  - `mocks/db/mocks.gen.go`
  - `mocks/fileaccess/mocks.gen.go`
  - `static/src/helpers/schema.gen.ts`

## Step 3: Database Migrations (If Needed)
- If schema changes are required, add symmetric migration pairs:
  - `db/migrations/postgres/`
  - `db/migrations/sqlite/`
- Keep sequences independently numbered for PostgreSQL and SQLite.
- **Reference**: Follow the [new-db-migration](../new-db-migration/SKILL.md) skill.

## Step 4: Backend Implementation
1. **DB Layer**: Update interface and SQL implementations in `db/`.
2. **API Layer**: Implement strict handler methods in `api/` accepting typed request objects and returning generated union response objects.
3. **Tests**: Add table-driven tests for strict handlers and DB queries with `gomock` and `go-sqlmock`.
- **Reference**: Follow the [writing-tests](../writing-tests/SKILL.md) skill.

## Step 5: Frontend Implementation
1. **API Client**: Consume generated endpoint types via `api.client` in `static/src/helpers/api.ts` or component code.
2. **Components**: Build or update Lit/Ionic components adhering to Light DOM (pages) or Shadow DOM (leaf components).
3. **State / Context**: Update context definitions under `static/src/context/` if shared state needs new properties or mutators.
4. **Tests**: Add Vitest component specs in `static/src/components/**/*.spec.ts`.
- **Reference**: Follow the [frontend-components](../frontend-components/SKILL.md) and [writing-tests](../writing-tests/SKILL.md) skills.

## Step 6: End-to-End Verification
Run the verification loop via the dev container:
1. `make test` – Ensures Go unit/DB tests and Vitest component tests pass.
2. `make lint` – Runs `go vet`, `revive`, `gosec`, and frontend ESLint.
3. `make build` – Confirms complete static bundle and server compilation.
