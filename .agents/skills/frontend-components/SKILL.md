---
name: frontend-components
description: Guide for creating and modifying Lit and Ionic components in GOMP. Use this when asked to add or update UI components in static/src.
---

# Frontend Component Guide (Lit + Ionic)

Use this guide when creating or modifying frontend components under `static/src/components/`.

## 1. Page Components vs. Leaf Components

### Page-Level Components (`static/src/components/pages/`)
Page components represent top-level routed views (e.g. `page-recipe`, `page-login`, `page-search`).
- **Render Root**: **Must** override `createRenderRoot() { return this; }` to render into the Light DOM. This ensures Ionic navigation animations and routing (`ion-router`, `ion-nav`) function properly.
- **Styling**: Import an external CSS file directly (e.g., `import './page-recipe.css';`) rather than using Lit's `css` tagged template literal.
- **Lifecycle**: Implement `ComponentWithActivatedCallback` and `async activatedCallback()` to reload data when navigated to. Also call load logic in `connectedCallback()`.

```ts
@customElement('page-example')
export class PageExample extends LitElement implements ComponentWithActivatedCallback {
  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.load().catch(console.error);
  }

  async activatedCallback() {
    await this.load();
  }
}
```

### Leaf / Reusable Components (`static/src/components/<name>/`)
Reusable components (e.g. `recipe-editor`, `tags-input`, `note-card`) encapsulate specific widgets or sections.
- **Render Root**: Default Shadow DOM (do **not** override `createRenderRoot`).
- **Styling**: Use static `styles` with `globalStyles` and Lit's `css` tag:
  ```ts
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
      }
    `
  ];
  ```

---

## 2. State Management & Reactivity

Global state is managed via Lit Context (`@lit/context`) under `static/src/context/`:
- `userContext`: User authentication state (`user`, `login()`, `logout()`).
- `searchContext`: Search parameters, pagination, and results (`filter`, `settings`, `page`, `results`, `setFilter()`, `refresh()`).
- `configContext`: Application configuration and metadata (`config`, `info`, `setConfig()`).

### Consuming Context in Components
- **Reading state in `render()`**: Subscribe to the context so Lit automatically requests updates when values change:
  ```ts
  @consume({ context: userContext, subscribe: true })
  @property({ attribute: false })
  userCtx?: UserContextValue;
  ```
- **Write-Only / Action Invocation**: When a component only triggers updates/mutations (e.g. setting search filters or logging in) and does not need to re-render on state changes, set `subscribe: false`:
  ```ts
  @consume({ context: searchContext, subscribe: false })
  @property({ attribute: false })
  searchCtx?: SearchContextValue;
  ```
- **Leaf / Presentational Components**: Prefer receiving data via standard Lit `@property()` bindings passed from parent templates (e.g., `<recipe-card .recipe=${recipe}>`).

### Persistence with `StorageController`
Properties synced with browser storage use `StorageController` (`static/src/helpers/storage-controller.ts`):
- `currentUser`: Backed by `localStorage` with multi-tab `storage` event synchronization.
- `searchFilter`, `searchSettings`, `searchPage`, `searchResultsPerPage`: Backed by `sessionStorage`.

---

## 3. API Communication

Use the typed OpenAPI client exported from `static/src/helpers/api.ts`:
- Import `api` from `../../helpers/api`.
- Client methods are typed using the generated schemas from `helpers/schema.gen.ts`:
  ```ts
  const { data, error } = await api.client.GET('/recipes/{recipe-id}', {
    params: { path: { 'recipe-id': id } }
  });
  ```
- Use `state.loadingCount` automatically managed by `api.client` for loading state indicators.

---

## 4. Ionic Overlays & Alerts

Always use the typed helper wrappers from `static/src/helpers/modals.ts` instead of calling Ionic controller singletons directly:
- `showAlert({ header, message, buttons })`
- `showToast({ message, duration, color })`
- `showModal({ component, componentProps })`
- `showLoading({ message })`

---

## 5. Navigation

- Use `redirect('/path')` from `static/src/helpers/utils.ts` to navigate programmatically via `ion-router`.
