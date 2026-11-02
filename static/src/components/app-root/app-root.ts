import { actionSheetController, alertController, modalController, popoverController, RouterCustomEvent } from '@ionic/core';
import { LitElement, html, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Subscription } from 'rxjs';
import { api, refreshSearchResults } from '../../helpers/api';
import { showModal } from '../../helpers/modals';
import { AccessLevel, SearchFilter } from '../../helpers/schema.gen';
import { isAuthorized, isNull, isNullOrEmpty, redirect, sendActivatedCallback } from '../../helpers/utils';
import { getDefaultSearchFilter } from '../../models';
import appConfig, { appConfigStore } from '../../stores/config';
import appState, { appStateStore, clearState } from '../../stores/state';
import { StoreController } from '../../stores/store';

// Import page components and placeholders
import './app-root.css';
import '../pages/home/page-home';
import '../pages/login/page-login';
import '../pages/search/page-search';
import '../pages/recipe/page-recipe';
import '../pages/tags/page-tags';
import '../pages/settings/page-settings';
import '../pages/admin/page-admin';
import '../search-filter-editor/search-filter-editor';
import '../app-icon/app-icon';

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
    ['/recipes', { title: 'Recipes', icon: 'chef_hat', showOn: () => this.isLoggedIn(), detail: () => appState.totalRecipeCount ?? 0 }],
    ['/tags', { title: 'Tags', icon: 'bookmarks', showOn: () => this.isLoggedIn(), detail: () => appState.totalTagsCount ?? 0 }],
    ['/settings', { title: 'Settings', icon: 'settings', showOn: () => this.isLoggedIn() }],
    ['/settings/preferences', { title: 'Preferences', icon: 'tune', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/settings/searches', { title: 'Searches', icon: 'saved_search', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/settings/security', { title: 'Security', icon: 'fingerprint', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/admin', { title: 'Admin', icon: 'security', showOn: () => this.isAdmin() }],
    ['/admin/configuration', { title: 'Configuration', icon: 'description', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
    ['/admin/users', { title: 'Users', icon: 'group', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
    ['/admin/maintenance', { title: 'Maintenance', icon: 'construction', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
  ]);

  @state() pageTitle = '';
  @state() childPageTitle = '';

  @query('ion-router-outlet') private readonly routerOutlet?: HTMLIonRouterOutletElement;
  @query('ion-menu') private readonly menu?: HTMLIonMenuElement;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();

    // Automatically trigger a logout if an API returns a 401
    this.subscriptions.push(api.responses.subscribe(async ({ request, response }) => {
      if (response.status === 401) {
        // Make sure we don't recursively call ourselves if the logout also triggers a 401
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

  render() {
    return html`
      <ion-app>
        <ion-router
          .useHash=${false}
          @ionRouteWillChange=${() => this.onPageChanging()}
          @ionRouteDidChange=${(e: RouterCustomEvent) => this.onPageChanged(e)}
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

        <ion-menu side="start" content-id="main-content">
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
                      color=${isActive && !isParentOfActive ? 'secondary' : nothing}
                      ?detail=${isActive && !isParentOfActive}
                      class=${classMap({ 'active': isActive, 'child-link': !isNullOrEmpty(link.parentUrl), })}
                    >
                      <ion-text slot="start" color=${isParentOfActive ? 'secondary' : nothing}>
                        <app-icon name=${link.icon}></app-icon>
                      </ion-text>
                      <ion-label color=${isParentOfActive ? 'secondary' : nothing}>${link.title}</ion-label>
                      ${!isNull(link.detail) ? html`<ion-label slot="end">${link.detail()}</ion-label>` : nothing}
                    </ion-item>
                  `;
        })}
              <ion-item button @click=${() => this.logout()}>
                <app-icon slot="start" name="logout"></app-icon>
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
                  ${appState.loadingCount > 0 ? html`<ion-spinner name="bubbles"></ion-spinner>` : html`<app-icon name="menu"></app-icon>`}
                </ion-menu-button>
              </ion-buttons>

              <ion-title slot="start">
                <ion-router-link color="light" href="/">${appConfig.config.title}</ion-router-link>
                ${!isNullOrEmpty(this.pageTitle) ? html`<ion-text color="light" class="ion-display-md-none"> | ${this.pageTitle}</ion-text>` : nothing}
              </ion-title>

              <ion-buttons id="toolbar-menu" slot="end" class="ion-display-none ion-display-sm-flex">
                ${Array.from(this.appLinks.entries())
        .filter(([, link]) => link.showOn('toolbar'))
        .map(([url, link]) => [
          html`
                      <ion-button
                        size="small"
                        fill=${this.pageTitle === link.title ? 'solid' : 'clear'}
                        class=${classMap({ 'active': this.pageTitle === link.title, 'ion-display-none': true, 'ion-display-md-flex': true, })}
                        href=${url}
                        title=${link.title}
                      >
                        <app-icon slot="start" name=${link.icon}></app-icon>
                        ${link.title}
                      </ion-button>
                    `,
          html`
                      <ion-button
                        size="small"
                        fill=${this.pageTitle === link.title ? 'solid' : 'clear'}
                        class=${classMap({ 'active': this.pageTitle === link.title, 'ion-display-md-none': true, })}
                        href=${url}
                        title=${link.title}
                      >
                        <app-icon slot="icon-only" name=${link.icon} size="small"></app-icon>
                      </ion-button>
                    `
        ])}
              </ion-buttons>

              </ion-buttons>

              <ion-searchbar
                slot="end"
                class="end ion-display-none ion-display-lg-flex"
                .autocorrect=${true}
                .spellcheck=${true}
                .disabled=${!this.isLoggedIn()}
                .value=${appState.searchFilter?.query ?? ''}
                @keydown=${(e: KeyboardEvent) => this.onSearchKeyDown(e)}
                @ionBlur=${(e: Event) => ((e.currentTarget as HTMLIonSearchbarElement).value = appState.searchFilter?.query ?? '')}
                @ionClear=${() => this.onSearchClearClicked()}
              ></ion-searchbar>
              <ion-buttons slot="end" class="ion-display-none ion-display-lg-flex">
                <ion-button title="Reset Search" .disabled=${!this.isLoggedIn() || this.isDefaultSearch()} @click=${() => this.onSearchCancelClicked()}>
                  <app-icon slot="icon-only" name="search_off"></app-icon>
                </ion-button>
                <ion-button title="Search Settings" .disabled=${!this.isLoggedIn()} @click=${() => this.onSearchFilterClicked()}>
                  <app-icon slot="start" name="filter_list"></app-icon>
                  <ion-badge color="secondary">${appState.searchResultCount ?? 0}</ion-badge>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>

            <ion-toolbar color="primary" class="ion-display-lg-none">
              <ion-searchbar
                .autocorrect=${true}
                .spellcheck=${true}
                .disabled=${!this.isLoggedIn()}
                .value=${appState.searchFilter?.query ?? ''}
                @keydown=${(e: KeyboardEvent) => this.onSearchKeyDown(e)}
                @ionBlur=${(e: Event) => ((e.currentTarget as HTMLIonSearchbarElement).value = appState.searchFilter?.query ?? '')}
                @ionClear=${() => this.onSearchClearClicked()}
              ></ion-searchbar>
              <ion-buttons slot="end">
                <ion-button title="Reset Search" .disabled=${!this.isLoggedIn() || this.isDefaultSearch()} @click=${() => this.onSearchCancelClicked()}>
                  <app-icon slot="icon-only" name="search_off"></app-icon>
                </ion-button>
                <ion-button title="Search Settings" .disabled=${!this.isLoggedIn()} @click=${() => this.onSearchFilterClicked()}>
                  <app-icon slot="start" name="filter_list"></app-icon>
                  <ion-badge color="secondary">${appState.searchResultCount ?? 0}</ion-badge>
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
    return !isNull(appState.currentUser);
  }

  private requireLogin() {
    if (this.isLoggedIn()) {
      return true;
    }
    return { redirect: '/login' };
  }

  private isAdmin() {
    return this.isLoggedIn() && isAuthorized(appState.currentUser, AccessLevel.Admin);
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

  private async onPageChanged(e: RouterCustomEvent) {
    // Where the route contains dynamic segments (e.g., /recipes/:id),
    // we need to get the base route without the dynamic segment.
    let route = e.detail.to;
    const idRouteMatcher = /^(?<base>\/[\w-]+)\/\d+\/?$/;
    const match = idRouteMatcher.exec(e.detail.to);
    if (match) {
      route = match.groups?.base ?? route;
    }

    // Set the page title based on the active page
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
      // Make sure there are search results on initial load
      if (isNull(appState.searchResults)) {
        await refreshSearchResults().catch(console.error);
      }
    }

    // Let the new page know it's been activated
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
      appState.searchFilter = {
        ...appState.searchFilter,
        query: searchBar.value?.toString() ?? ''
      };
      await redirect('/recipes');
    }
  }

  private async onSearchClearClicked() {
    if (!this.isLoggedIn()) {
      return;
    }

    appState.searchFilter = {
      ...appState.searchFilter,
      query: ''
    };
    await redirect('/recipes');
  }

  private async onSearchCancelClicked() {
    if (!this.isLoggedIn()) {
      return;
    }

    appState.searchFilter = getDefaultSearchFilter();
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
        searchFilter: appState.searchFilter
      },
    });
    if (!isNull(data)) {
      appState.searchFilter = data.searchFilter;
      await redirect('/recipes');
    }
  }

  private isDefaultSearch() {
    const defaultFilter = getDefaultSearchFilter();
    const currentFilter = {
      ...defaultFilter,
      ...appState.searchFilter
    };
    return JSON.stringify(defaultFilter) === JSON.stringify(currentFilter);
  }
}
