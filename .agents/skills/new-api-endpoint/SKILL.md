---
name: new-api-endpoint
description: Guide for adding new API endpoints in GOMP. Use this when asked to create or update API endpoints.
---

# New API Endpoint Checklist

Use this checklist when adding a new API endpoint to GOMP.

## 1) Define API Contract
- Ensure all route paths consist strictly of NOUNs identifying resources or collections (e.g., `/recipes`, `/tags`); HTTP verbs dictate actions. Never use verbs or action-based names in route paths (e.g., avoid `/recipes/delete-bulk`, `/recipes/{id}/archive`, or `/do-action`).
- Add or update the path, operation, request body, responses, and security in `openapi.yaml`.
- Add or update shared schema definitions in `models.yaml` if the endpoint needs new types.
- Add clear `summary` and `description` values to improve generated docs and agent comprehension.

## 2) Regenerate Code
- Run `make codegen`.
- Confirm generated updates landed in:
  - `api/routes.gen.go`
  - `models/models.gen.go`
  - `static/src/helpers/schema.gen.ts`

## 3) Implement Server Handler
- Implement the generated strict handler method on `apiHandler` in the relevant file under `api/`.
- Handlers follow the `strict-server` pattern accepting `(ctx context.Context, req <Operation>RequestObject)` and returning `(<Operation>ResponseObject, error)`.
- Keep logic in existing patterns:
  - pull logger from context
  - validate path/body consistency where needed
  - return typed responses from generated response unions

## 4) Wire Data Access
- Use `db.Driver` interfaces only.
- Add methods to DB driver interfaces and SQL implementations only when required.
- If data shape changed, update SQL queries and scans in DB layer.

## 5) Add Tests
- API handler tests: test the strict handler directly using table-driven tests and `gomock` against `mocks/db` and `mocks/fileaccess`. Use `httptest` when testing middleware or raw HTTP routing.
- DB tests: use `go-sqlmock` patterns in `db/*_test.go`.
- Interface mocking: use mocks from `mocks/db` and `mocks/fileaccess` where appropriate.
- Cover success and failure branches (validation, auth, not found, conflict if applicable).

## 6) Validate
- Run `make test`.
- Run `make lint`.
- If frontend types changed, ensure client build still passes via existing build/test flow.

## Guardrails
- Do not hand-edit generated files.
- Keep endpoint naming consistent with current `operationId` style.
- Add only the minimum schema surface needed for the endpoint.
