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

Global state is managed by `appStateStore` in `static/src/stores/state.ts`.
- **Connecting Component to Store**: Add `protected stateController = new StoreController(this, appStateStore);` to subscribe the component to store changes and trigger automatic re-renders.
- **Accessing State**: Import `appState` from `stores/state` (e.g., `appState.currentUser`, `appState.searchFilter`).
- **Listening to Property Changes**: Use `onStateChange('propName', callback)` for imperative triggers outside of render cycles.

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
