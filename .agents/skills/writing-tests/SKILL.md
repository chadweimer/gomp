---
name: writing-tests
description: Guide for writing tests in GOMP. Use this when asked to create or run tests.
---

# Writing Tests in GOMP

**ALWAYS use this skill when asked to write or add tests.**

## Backend Go Server

Use this guide for consistent tests across API, DB, and middleware layers.

### Core Patterns
- For Go, **always** use table-driven tests when testing multiple input/output scenarios.
- For Go, Keep tests in package-local `*_test.go` files near the implementation.
- Focus on behavior and contract verification over implementation detail.

### API Layer Tests (`api/`)
- Use `httptest.NewRequest` and `httptest.NewRecorder`.
- Route through generated handler wiring where possible to exercise request parsing and response encoding.
- Verify:
  - HTTP status code
  - response body payload
  - auth/permission behavior
  - error mapping for invalid request/body/path mismatches

### DB Layer Tests (`db/`)
- Use `go-sqlmock` for SQL expectation tests.
- Assert SQL statements, bind argument ordering, and scan behavior.
- Include not-found and error-path checks.

### Mocks and Interfaces
- Use generated mocks under:
  - `mocks/db/mocks.gen.go`
  - `mocks/upload/mocks.gen.go`
- Regenerate with `go generate ./...` when interfaces change.

## Frontend Tests (Stencil + Vitest)

Use this guide for component tests under `static/src/components/**/test/*.spec.tsx`.

### Core Setup & Lifecycle
- Mount components with `render(<component-tag ... />)` from `@stencil/vitest`.
- Always `await waitForChanges()` after interactions, clicks, or event emissions to let Stencil finish its batched update cycle.
- In `beforeEach` and `afterEach`:
  - `fetchMocker.resetMocks()` to clear mock routes and recorded calls.
  - `clearState()` from `stores/state` to reset global app state between tests.
  - Restore `globalThis.fetch` and call `vi.restoreAllMocks()`.
  - Clean up any manually mounted DOM elements (e.g., mock router) in `afterEach`.

### Mocking HTTP Requests (`fetchMocker`)
- Import `fetchMocker` from `../../../../../vitest.setup` (or relative path to `static/vitest.setup.ts`).
- Mock responses matching `req.url` (regex) and `req.method`:
  ```ts
  fetchMocker.mockResponse((req: Request) => {
    if (req.url.match(/\/recipes\/\d+$/) && req.method === 'GET') {
      return { status: 200, body: JSON.stringify(mockRecipe) };
    }
    return { status: 404, body: '' };
  });
  ```
- Inspect outgoing payloads:
  ```ts
  const putReq = requests.find(r => r.url.match(/\/recipes\/1$/) && r.method === 'PUT');
  const body = (await putReq?.clone().json()) as Recipe;
  expect(body.name).toBe('Updated Recipe');
  ```
- **Error handling during initial load**: `@stencil/vitest` captures any `Error` passed to `console.error` during `render()` and re-throws it after hydration. When testing failed initial data loading (e.g. 500 status), wrap `render(...)` in `try / catch`, assert that the lifecycle error was caught, and verify that the component in DOM degraded gracefully to its fallback state.

### Mocking Ionic Controllers & Overlays
- Controllers (`alertController`, `modalController`, `actionSheetController`, `toastController`, `loadingController`) from `@ionic/core` are singletons.
- Provide typed mock helpers to avoid `any` and satisfy linter:
  ```ts
  function mockModal(data: unknown = null): HTMLIonModalElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data }),
    } as unknown as HTMLIonModalElement;
  }

  function mockAlert(role = 'confirm'): HTMLIonAlertElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role }),
    } as unknown as HTMLIonAlertElement;
  }

  function mockToast(): HTMLIonToastElement {
    return {
      present: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLIonToastElement;
  }
  ```
- **Avoid `@typescript-eslint/unbound-method` errors**: Store the spy in a variable and assert against it rather than passing `controller.create` directly into `expect()`:
  ```ts
  const createAlertSpy = vi.spyOn(alertController, 'create').mockResolvedValue(mockAlert('confirm'));
  // ... trigger action ...
  expect(createAlertSpy).toHaveBeenCalledWith(expect.objectContaining({ header: 'Delete Recipe?' }));
  ```

### Mocking Navigation (`ion-router`)
- When components call `redirect(route)` (which queries `document.querySelector('ion-router')`), attach a mock router to `document.body` in `beforeEach`:
  ```ts
  let routerEl: HTMLIonRouterElement;
  beforeEach(() => {
    routerEl = document.createElement('ion-router');
    routerEl.push = vi.fn().mockResolvedValue(true);
    document.body.appendChild(routerEl);
  });
  afterEach(() => {
    routerEl.remove();
  });
  ```
- Assert navigation with `expect(routerEl.push).toHaveBeenCalledWith('/recipes');`.

### Role-Based Access Control (RBAC) Testing
- Modify `state.currentUser` directly with desired `AccessLevel`:
  - `AccessLevel.Viewer` (or `undefined`): verify `readonly={true}` on child components, editor actions hidden from menus/toolbars.
  - `AccessLevel.Editor` / `AccessLevel.Admin`: verify full action controls visible and functional.

### Child Component Events & Queries
- Stencil component interfaces (`HTMLRecipeViewerElement`, `HTMLNoteCardElement`, etc.) are declared globally in `components.d.ts`—use them for query selectors: `root.querySelector<HTMLRecipeViewerElement>('recipe-viewer')`.
- Trigger component custom events via `dispatchEvent`:
  ```ts
  recipeViewer?.dispatchEvent(new CustomEvent('ratingSelected', { detail: 5 }));
  await waitForChanges();
  ```

### Linting Guardrails
- Avoid `as any` or `@typescript-eslint/no-unsafe-*` violations.
- Avoid passing unbound object methods into `expect()`.
- Cast overlay messages when asserting strings: `expect(alertOptions.message as string).toContain('...');` to satisfy `@typescript-eslint/no-base-to-string`.

## For All Types

### Coverage Expectations
- Add tests for success path and at least one meaningful failure path.
- For write endpoints, verify side effects and returned payload shape.
- For auth-sensitive endpoints, test denied and allowed roles.

### Validation Loop
1. `make codegen` (if schemas/interfaces changed)
2. `make test`
3. `make lint`

### Guardrails
- Do not test generated files directly.
- Avoid brittle tests that depend on exact log text or unrelated ordering.
- Keep fixtures minimal and focused.
