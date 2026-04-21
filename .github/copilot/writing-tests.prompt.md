# Writing Tests in GOMP

Use this guide for consistent tests across API, DB, and middleware layers.

## Core Patterns
- Prefer table-driven tests for input/output coverage.
- Keep tests in package-local `*_test.go` files near the implementation.
- Focus on behavior and contract verification over implementation detail.

## API Layer Tests (`api/`)
- Use `httptest.NewRequest` and `httptest.NewRecorder`.
- Route through generated handler wiring where possible to exercise request parsing and response encoding.
- Verify:
  - HTTP status code
  - response body payload
  - auth/permission behavior
  - error mapping for invalid request/body/path mismatches

## DB Layer Tests (`db/`)
- Use `go-sqlmock` for SQL expectation tests.
- Assert SQL statements, bind argument ordering, and scan behavior.
- Include not-found and error-path checks.

## Mocks and Interfaces
- Use generated mocks under:
  - `mocks/db/mocks.gen.go`
  - `mocks/upload/mocks.gen.go`
- Regenerate with `go generate ./...` when interfaces change.

## Coverage Expectations
- Add tests for success path and at least one meaningful failure path.
- For write endpoints, verify side effects and returned payload shape.
- For auth-sensitive endpoints, test denied and allowed roles.

## Validation Loop
1. `make codegen` (if schemas/interfaces changed)
2. `make test`
3. `make lint`

## Guardrails
- Do not test generated files directly.
- Avoid brittle tests that depend on exact log text or unrelated ordering.
- Keep fixtures minimal and focused.
