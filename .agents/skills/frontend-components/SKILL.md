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

Global state is managed by `appStateStore` in `static/src/stores/state.ts` (and configuration by `appConfigStore` in `static/src/stores/config.ts`).

### When to Use `StoreController`
Reactivity in Lit is component-scoped (`host.requestUpdate()`). Attaching a controller to a parent (or `app-root`) does **not** re-render descendant or routed components.
- **Attach `StoreController` when**: The component directly reads global store properties (e.g., `appState.currentUser`, `appState.searchResults`, `appConfig.title`) inside its `render()` template and must re-render when the store changes.
  ```ts
  protected stateController = new StoreController(this, appStateStore);
  ```
- **Do NOT attach `StoreController` when**:
  - **Leaf / Presentational Components**: They should receive data via standard Lit `@property()` bindings passed from parent templates (e.g., `<recipe-card .recipe=${recipe}>`). When the parent updates, Lit automatically updates the child.
  - **Write-Only Components**: If a component only writes/mutates store state (e.g., `appState.currentUser = user` in `page-login` or setting `searchFilter` before navigating), it does not need a controller.
  - **Page-Local State**: Pages that manage their own data via local `@state()` loaded on navigation via `activatedCallback()` / `connectedCallback()` do not need a store controller unless they also bind directly to store properties in `render()`.

### Imperative Property Changes
- **Listening to Property Changes**: Use `onStateChange('propName', callback)` (or `store.onChange('key', callback)`) for imperative side effects outside of render cycles without subscribing the entire component to every store update.

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
