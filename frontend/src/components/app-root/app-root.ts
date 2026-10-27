import { actionSheetController, alertController, modalController, popoverController, RouterEventDetail } from '@ionic/core';
import { LitElement, html } from 'lit';
import { customElement, state as litState } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Subscription } from 'rxjs';
import { api, refreshSearchResults } from '../../helpers/api';
import { showModal } from '../../helpers/modals';
import { AccessLevel, SearchFilter } from '../../helpers/schema.gen';
import { isAuthorized, isNull, isNullOrEmpty, redirect, sendActivatedCallback } from '../../helpers/utils';
import { getDefaultSearchFilter } from '../../models';
import appConfig, { appConfigStore } from '../../stores/config';
import state, { appStateStore, clearState } from '../../stores/state';
import { StoreController } from '../../stores/store';

// Import placeholders so customElements are registered
import '../pages/page-home.placeholder';
import '../pages/page-login.placeholder';
import '../pages/page-search.placeholder';
import '../pages/page-recipe.placeholder';
import '../pages/page-tags.placeholder';
import '../pages/page-settings.placeholder';
import '../pages/page-admin.placeholder';

interface AppLink {
  title: string;
  icon: string;
  showOn: (type: 'menu' | 'toolbar') => boolean;
  detail?: () => number;
  parentUrl?: string;
}

@customElement('app-root')
export class AppRoot extends LitElement {
  // Connect to reactive stores
  protected stateController = new StoreController(this, appStateStore);
  protected configController = new StoreController(this, appConfigStore);

  private readonly subscriptions: Subscription[] = [];

  private readonly appLinks: Map<string, AppLink> = new Map<string, AppLink>([
    ['/', { title: 'Home', icon: 'home', showOn: (type: 'menu' | 'toolbar') => type === 'menu' }],
    ['/recipes', { title: 'Recipes', icon: 'restaurant', showOn: () => this.isLoggedIn(), detail: () => state.totalRecipeCount ?? 0 }],
    ['/tags', { title: 'Tags', icon: 'bookmarks', showOn: () => this.isLoggedIn(), detail: () => state.totalTagsCount ?? 0 }],
    ['/settings', { title: 'Settings', icon: 'settings', showOn: () => this.isLoggedIn() }],
    ['/settings/preferences', { title: 'Preferences', icon: 'options', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/settings/searches', { title: 'Searches', icon: 'search', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/settings/security', { title: 'Security', icon: 'finger-print', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/admin', { title: 'Admin', icon: 'shield-checkmark', showOn: () => this.isAdmin() }],
    ['/admin/configuration', { title: 'Configuration', icon: 'document-text', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
    ['/admin/users', { title: 'Users', icon: 'people', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
    ['/admin/maintenance', { title: 'Maintenance', icon: 'build', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
  ]);

  @litState() pageTitle = '';
  @litState() childPageTitle = '';

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();

    // Automatically trigger a logout if an API returns a 401
    this.subscriptions.push(api.responses.subscribe(async ({ request, response }) => {
      if (response.status === 401) {
        if (!request.url.endsWith('/auth') || request.method.toLowerCase() !== 'delete') {
          await this.logout();
        }
      }
    }));

    this.loadAppConfiguration().catch(console.error);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.length = 0;
  }

  private get routerOutlet(): HTMLIonRouterOutletElement | null {
    return this.querySelector('ion-router-outlet');
  }

  private get menu(): HTMLIonMenuElement | null {
    return this.querySelector('ion-menu');
  }

  render() {
    return html`
      <ion-app>
        <ion-router
          .useHash=${false}
          @ionRouteWillChange=${() => this.onPageChanging()}
          @ionRouteDidChange=${(e: CustomEvent<RouterEventDetail>) => this.onPageChanged(e)}
        >
          <ion-route url="/login" component="page-login"></ion-route>

          <ion-route url="/" component="page-home" .beforeEnter=${() => this.requireLogin()}></ion-route>

          {/* Redirect legacy search URL for backward compatibility */}
          <ion-route-redirect from="/search" to="/recipes"></ion-route-redirect>
          <ion-route url="/recipes" component="ion-router-outlet" .beforeEnter=${() => this.requireLogin()}>
            <ion-route component="page-search"></ion-route>
            <ion-route url="/:recipeId" component="page-recipe"></ion-route>
          </ion-route>

          <ion-route url="/tags" component="page-tags" .beforeEnter=${() => this.requireLogin()}></ion-route>

          <ion-route-redirect from="/settings" to="/settings/preferences"></ion-route-redirect>
          <ion-route url="/settings" component="page-settings" .beforeEnter=${() => this.requireLogin()}>
            <ion-route url="/preferences" component="tab-settings-preferences"></ion-route>
            <ion-route url="/searches" component="tab-settings-searches"></ion-route>
            <ion-route url="/security" component="tab-settings-security"></ion-route>
          </ion-route>

          <ion-route-redirect from="/admin" to="/admin/configuration"></ion-route-redirect>
          <ion-route url="/admin" component="page-admin" .beforeEnter=${() => this.requireAdmin()}>
            <ion-route url="/configuration" component="tab-admin-configuration"></ion-route>
            <ion-route url="/users" component="tab-admin-users"></ion-route>
            <ion-route url="/maintenance" component="tab-admin-maintenance"></ion-route>
          </ion-route>
        </ion-router>

        <ion-menu side="start" type="reveal" content-id="main-content">
          <ion-content>
            <ion-list class="ion-no-padding">
              ${Array.from(this.appLinks.entries())
        .filter(([, link]) => link.showOn('menu'))
        .map(([url, link]) => {
          const isActive = this.pageTitle === link.title || this.childPageTitle === link.title;
          const isParentOfActive = this.pageTitle === link.title && !isNullOrEmpty(this.childPageTitle);
          return html`
                    <ion-item
                      href=${url}
                      color=${isActive && !isParentOfActive ? 'secondary' : undefined}
                      .detail=${isActive && !isParentOfActive}
                      class=${classMap({
                        'active': isActive,
                        'child-link': !isNullOrEmpty(link.parentUrl),
                      })}
                    >
                      <ion-icon name=${link.icon} slot="start" color=${isParentOfActive ? 'secondary' : undefined}></ion-icon>
                      <ion-label color=${isParentOfActive ? 'secondary' : undefined}>${link.title}</ion-label>
                      ${!isNull(link.detail) ? html`<ion-label slot="end">${link.detail()}</ion-label>` : ''}
                    </ion-item>
                  `;
        })}
              <ion-item button @click=${() => this.logout()}>
                <ion-icon name="log-out" slot="start"></ion-icon>
                <ion-label>Logout</ion-label>
              </ion-item>
            </ion-list>
          </ion-content>

          <ion-footer color="medium" class="ion-text-center ion-padding copyright">
            GOMP: Go Meal Planner ${appConfig.info.version}. ${appConfig.info.copyright}
          </ion-footer>
        </ion-menu>

        <div class="ion-page" id="main-content">
          <ion-header mode="md" class="hide-on-print">
            <ion-toolbar color="primary">
              <ion-buttons slot="start">
                <ion-menu-button>
                  ${state.loadingCount > 0 ? html`<ion-spinner name="bubbles"></ion-spinner>` : html`<ion-icon name="menu"></ion-icon>`}
                </ion-menu-button>
              </ion-buttons>

              <ion-title slot="start">
                <ion-router-link color="light" href="/">${appConfig.config.title}</ion-router-link>
                ${!isNullOrEmpty(this.pageTitle) ? html`<ion-text color="light" class="ion-display-md-none"> | ${this.pageTitle}</ion-text>` : ''}
              </ion-title>

              <ion-buttons id="toolbar-menu" slot="end" class="ion-display-none ion-display-sm-flex">
                ${Array.from(this.appLinks.entries())
        .filter(([, link]) => link.showOn('toolbar'))
        .map(([url, link]) => [
          html`
                      <ion-button
                        size="small"
                        fill=${this.pageTitle === link.title ? 'solid' : 'clear'}
                        class=${classMap({
                          'active': this.pageTitle === link.title,
                          'ion-display-none': true,
                          'ion-display-md-flex': true,
                        })}
                        href=${url}
                        title=${link.title}
                      >
                        <ion-icon slot="start" name=${link.icon}></ion-icon>
                        ${link.title}
                      </ion-button>
                    `,
          html`
                      <ion-button
                        size="small"
                        fill=${this.pageTitle === link.title ? 'solid' : 'clear'}
                        class=${classMap({
                          'active': this.pageTitle === link.title,
                          'ion-display-md-none': true,
                        })}
                        href=${url}
                        title=${link.title}
                      >
                        <ion-icon slot="icon-only" name=${link.icon} size="small"></ion-icon>
                      </ion-button>
                    `
        ])}
              </ion-buttons>

              <ion-searchbar
                slot="end"
                class="end ion-display-none ion-display-lg-flex"
                .disabled=${!this.isLoggedIn()}
                show-cancel-button=${this.isDefaultSearch() ? 'never' : 'always'}
                cancel-button-text="Reset"
                cancel-button-icon="arrow-undo-outline"
                .value=${state.searchFilter?.query ?? ''}
                @keydown=${(e: KeyboardEvent) => this.onSearchKeyDown(e)}
                @ionBlur=${(e: Event) => ((e.currentTarget as HTMLIonSearchbarElement).value = state.searchFilter?.query ?? '')}
                @ionClear=${() => this.onSearchClearClicked()}
                @ionCancel=${() => this.onSearchCancelClicked()}
              ></ion-searchbar>
              <ion-buttons slot="end" class="ion-display-none ion-display-lg-flex">
                <ion-button color="light" .disabled=${!this.isLoggedIn()} @click=${() => this.onSearchFilterClicked()}>
                  <ion-icon name="filter" slot="start"></ion-icon>
                  <ion-badge color="secondary">${state.searchResultCount ?? 0}</ion-badge>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>

            <ion-toolbar color="primary" class="ion-display-lg-none">
              <ion-searchbar
                .disabled=${!this.isLoggedIn()}
                show-cancel-button=${this.isDefaultSearch() ? 'never' : 'always'}
                cancel-button-text="Reset"
                cancel-button-icon="arrow-undo-outline"
                .value=${state.searchFilter?.query ?? ''}
                @keydown=${(e: KeyboardEvent) => this.onSearchKeyDown(e)}
                @ionBlur=${(e: Event) => ((e.currentTarget as HTMLIonSearchbarElement).value = state.searchFilter?.query ?? '')}
                @ionClear=${() => this.onSearchClearClicked()}
                @ionCancel=${() => this.onSearchCancelClicked()}
              ></ion-searchbar>
              <ion-buttons slot="end">
                <ion-button color="light" .disabled=${!this.isLoggedIn()} @click=${() => this.onSearchFilterClicked()}>
                  <ion-icon name="filter" slot="start"></ion-icon>
                  <ion-badge color="secondary">${state.searchResultCount ?? 0}</ion-badge>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content>
            <ion-router-outlet></ion-router-outlet>
          </ion-content>
        </div>
      </ion-app>
    `;
  }

  private async loadAppConfiguration() {
    try {
      const { data: info, error: infoError } = await api.client.GET('/app/info');
      if (infoError) {
        throw new Error('Failed to load app info', { cause: infoError });
      }

      const { data: config, error: configError } = await api.client.GET('/app/configuration');
      if (configError) {
        throw new Error('Failed to load app configuration', { cause: configError });
      }

      appConfig.info = info;
      appConfig.config = config;

      document.title = appConfig.config.title;
      const appName = document.querySelector('meta[name="application-name"]');
      if (!isNull(appName)) {
        appName.setAttribute('content', document.title);
      }
      const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (!isNull(appTitle)) {
        appTitle.setAttribute('content', document.title);
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  private async logout() {
    clearState();
    try {
      const { error } = await api.client.DELETE('/auth');
      if (error) {
        throw new Error('Failed to logout.', { cause: error });
      }
      await redirect('/login');
    } catch (ex) {
      console.error(ex);
    }
  }

  private isLoggedIn() {
    return !isNull(state.currentUser);
  }

  private requireLogin() {
    if (this.isLoggedIn()) {
      return true;
    }
    return { redirect: '/login' };
  }

  private isAdmin() {
    return this.isLoggedIn() && isAuthorized(state.currentUser, AccessLevel.Admin);
  }

  private requireAdmin() {
    if (this.isAdmin()) {
      return true;
    }
    return { redirect: '/' };
  }

  private async closeAllOverlays() {
    const controllers = [
      actionSheetController,
      alertController,
      modalController,
      popoverController
    ];
    await Promise.all(controllers.map(controller => controller.dismiss().catch(() => { })));
  }

  private async onPageChanging() {
    await this.menu?.close();
  }

  private async onPageChanged(e: CustomEvent<RouterEventDetail>) {
    let route = e.detail.to;
    const idRouteMatcher = /^(?<base>\/[\w-]+)\/\d+\/?$/;
    const match = idRouteMatcher.exec(e.detail.to);
    if (match) {
      route = match.groups?.base ?? route;
    }

    const link = this.appLinks.get(route);
    if (!isNull(link)) {
      if (!isNullOrEmpty(link.parentUrl)) {
        const parentLink = this.appLinks.get(link.parentUrl);
        this.pageTitle = parentLink?.title ?? '';
        this.childPageTitle = link.title;
      } else {
        this.pageTitle = link.title;
        this.childPageTitle = '';
      }
    } else {
      this.pageTitle = '';
      this.childPageTitle = '';
    }

    if (this.isLoggedIn()) {
      if (isNull(state.searchResults)) {
        await refreshSearchResults().catch(console.error);
      }
    }

    if (this.routerOutlet) {
      await sendActivatedCallback(this.routerOutlet);
    }

    await this.closeAllOverlays();
  }

  private async onSearchKeyDown(e: KeyboardEvent) {
    if (!this.isLoggedIn()) {
      return;
    }

    if (e.key === 'Enter') {
      const searchBar = e.target as HTMLIonInputElement;
      state.searchFilter = {
        ...state.searchFilter,
        query: searchBar.value?.toString() ?? ''
      };
      await redirect('/recipes');
    }
  }

  private async onSearchClearClicked() {
    if (!this.isLoggedIn()) {
      return;
    }

    state.searchFilter = {
      ...state.searchFilter,
      query: ''
    };
    await redirect('/recipes');
  }

  private async onSearchCancelClicked() {
    if (!this.isLoggedIn()) {
      return;
    }

    state.searchFilter = getDefaultSearchFilter();
    await redirect('/recipes');
  }

  private async onSearchFilterClicked() {
    if (!this.isLoggedIn()) {
      return;
    }

    const { data } = await showModal<{ searchFilter: SearchFilter }>({
      presentingElement: this,
      component: 'search-filter-editor',
      componentProps: {
        saveLabel: 'Search',
        prompt: 'Search',
        showName: false,
        showSavedLoader: true,
        searchFilter: state.searchFilter
      },
    });
    if (!isNull(data)) {
      state.searchFilter = data.searchFilter;
      await redirect('/recipes');
    }
  }

  private isDefaultSearch() {
    const defaultFilter = getDefaultSearchFilter();
    const currentFilter = {
      ...defaultFilter,
      ...state.searchFilter
    };
    return JSON.stringify(defaultFilter) === JSON.stringify(currentFilter);
  }
}
