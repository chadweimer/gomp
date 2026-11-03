import { actionSheetController, alertController, modalController, popoverController, RouterCustomEvent } from '@ionic/core';
import { LitElement, html, nothing } from 'lit';
import { customElement, state, query, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { Subscription } from 'rxjs';
import { ContextRoot, provide } from '@lit/context';
import { api } from '../../helpers/api';
import { showModal } from '../../helpers/modals';
import { AccessLevel, AppConfiguration, AppInfo, RecipeCompact, SearchFilter, User } from '../../helpers/schema.gen';
import { isAuthorized, isNullOrEmpty, redirect, sendActivatedCallback } from '../../helpers/utils';
import { getDefaultSearchFilter, getDefaultSearchSettings, SearchSettings } from '../../models';
import { StorageController } from '../../helpers/storage-controller';
import {
  appStatusContext,
  AppStatusContextValue,
  configContext,
  ConfigContextValue,
  searchContext,
  SearchContextValue,
  userContext,
  UserContextValue
} from '../../context';

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
  private readonly contextRoot = new ContextRoot();
  private readonly subscriptions: Subscription[] = [];

  // Storage Controllers for persistence
  private readonly userStorage = new StorageController<User | undefined>(
    this,
    'currentUser',
    localStorage,
    undefined,
    { syncCrossTabs: true, onUpdate: () => this.updateUserContext() }
  );

  private readonly searchFilterStorage = new StorageController<SearchFilter>(
    this,
    'searchFilter',
    sessionStorage,
    getDefaultSearchFilter(),
    { onUpdate: () => this.onSearchParamChanged(false) }
  );

  private readonly searchSettingsStorage = new StorageController<SearchSettings>(
    this,
    'searchSettings',
    sessionStorage,
    getDefaultSearchSettings(),
    { onUpdate: () => this.onSearchParamChanged(false) }
  );

  private readonly searchPageStorage = new StorageController<number>(
    this,
    'searchPage',
    sessionStorage,
    1,
    { onUpdate: () => this.onSearchParamChanged(true) }
  );

  private readonly searchResultsPerPageStorage = new StorageController<24 | 36 | 60 | 96 | 120>(
    this,
    'searchResultsPerPage',
    sessionStorage,
    36,
    { onUpdate: () => this.onSearchParamChanged(false) }
  );

  private readonly appLinks: Map<string, AppLink> = new Map<string, AppLink>([
    ['/', { title: 'Home', icon: 'home', showOn: (type: 'menu' | 'toolbar') => type === 'menu' }],
    ['/recipes', { title: 'Recipes', icon: 'chef_hat', showOn: () => this.isLoggedIn(), detail: () => this.totalRecipeCount ?? 0 }],
    ['/tags', { title: 'Tags', icon: 'bookmarks', showOn: () => this.isLoggedIn(), detail: () => this.totalTagsCount ?? 0 }],
    ['/settings', { title: 'Settings', icon: 'settings', showOn: () => this.isLoggedIn() }],
    ['/settings/preferences', { title: 'Preferences', icon: 'tune', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/settings/searches', { title: 'Searches', icon: 'saved_search', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/settings/security', { title: 'Security', icon: 'fingerprint', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/admin', { title: 'Admin', icon: 'security', showOn: () => this.isAdmin() }],
    ['/admin/configuration', { title: 'Configuration', icon: 'description', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
    ['/admin/users', { title: 'Users', icon: 'group', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
    ['/admin/maintenance', { title: 'Maintenance', icon: 'construction', showOn: (type: 'menu' | 'toolbar') => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
  ]);

  // Context Providers
  @provide({ context: userContext })
  @property({ attribute: false })
  userCtx!: UserContextValue;

  @provide({ context: searchContext })
  @property({ attribute: false })
  searchCtx!: SearchContextValue;

  @provide({ context: configContext })
  @property({ attribute: false })
  configCtx!: ConfigContextValue;

  @provide({ context: appStatusContext })
  @property({ attribute: false })
  appStatusCtx!: AppStatusContextValue;

  // Search Results state
  @state() private searchResults?: RecipeCompact[];
  @state() private searchResultCount?: number;
  @state() private searchNumPages = 1;
  @state() private searchScrollPosition = 0;

  // Configuration state
  @state() appConfigInfo: AppInfo = {
    copyright: 'Copyright © Chad Weimer',
    version: '<Unknown>'
  };
  @state() appConfigData: AppConfiguration = {
    title: 'GOMP: Go Meal Planner'
  };

  // Status state
  @state() private loadingCount = 0;
  @state() private totalRecipeCount?: number;
  @state() private totalTagsCount?: number;

  @state() pageTitle = '';
  @state() childPageTitle = '';

  @query('ion-router-outlet') private readonly routerOutlet?: HTMLIonRouterOutletElement;
  @query('ion-menu') private readonly menu?: HTMLIonMenuElement;
  @query('#search-menu-popover') private readonly searchMenuPopover?: HTMLIonPopoverElement;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    this.contextRoot.attach(this);
    this.updateUserContext();
    this.updateSearchContext();
    this.updateConfigContext();
    this.updateStatusContext();

    super.connectedCallback();

    this.subscriptions.push(
      // Subscribe to api loading requests
      api.loading$.subscribe((count) => this.appStatusCtx.setLoadingCount(count)),
      // Automatically trigger a logout if an API returns a 401
      api.responses$.subscribe(async ({ request, response }) => {
        if (response.status === 401) {
          // Make sure we don't recursively call ourselves if the logout also triggers a 401
          if (!request.url.endsWith('/auth') || request.method.toLowerCase() !== 'delete') {
            await this.logout();
          }
        }
      })
    );

    this.loadAppConfiguration().catch(console.error);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.contextRoot.detach(this);
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.length = 0;
  }

  updateUserContext() {
    this.userCtx = {
      user: this.userStorage.get(),
      login: (user: User) => {
        this.userStorage.set(user);
        this.updateUserContext();
        this.executeSearch().catch(console.error);
      },
      logout: () => this.logout()
    };
  }

  updateSearchContext() {
    this.searchCtx = {
      filter: this.searchFilterStorage.get(),
      settings: this.searchSettingsStorage.get(),
      page: this.searchPageStorage.get(),
      numPages: this.searchNumPages,
      resultsPerPage: this.searchResultsPerPageStorage.get(),
      results: this.searchResults,
      resultCount: this.searchResultCount,
      scrollPosition: this.searchScrollPosition,
      setFilter: (filter: SearchFilter) => {
        this.searchFilterStorage.set(filter);
      },
      setSettings: (settings: SearchSettings) => {
        this.searchSettingsStorage.set(settings);
      },
      setPage: (page: number) => {
        this.searchPageStorage.set(page);
      },
      setResultsPerPage: (count: 24 | 36 | 60 | 96 | 120) => {
        this.searchResultsPerPageStorage.set(count);
      },
      setScrollPosition: (pos: number) => {
        this.searchScrollPosition = pos;
        this.updateSearchContext();
      },
      refresh: () => this.executeSearch(),
      reset: () => {
        this.searchFilterStorage.reset();
        this.searchPageStorage.reset();
        this.searchScrollPosition = 0;
        this.updateSearchContext();
      }
    };
  }

  updateConfigContext() {
    this.configCtx = {
      config: this.appConfigData,
      info: this.appConfigInfo,
      setConfig: (config: AppConfiguration) => {
        this.appConfigData = config;
        this.updateConfigContext();
        document.title = config.title;
      },
      setInfo: (info: AppInfo) => {
        this.appConfigInfo = info;
        this.updateConfigContext();
      }
    };
  }

  updateStatusContext() {
    this.appStatusCtx = {
      loadingCount: this.loadingCount,
      totalRecipeCount: this.totalRecipeCount,
      totalTagsCount: this.totalTagsCount,
      setLoadingCount: (count: number) => {
        this.loadingCount = count;
        this.updateStatusContext();
      },
      setTotalRecipeCount: (count: number) => {
        this.totalRecipeCount = count;
        this.updateStatusContext();
      },
      setTotalTagsCount: (count: number) => {
        this.totalTagsCount = count;
        this.updateStatusContext();
      }
    };
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
                      ${link.detail != null ? html`<ion-label slot="end">${link.detail()}</ion-label>` : nothing}
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
            GOMP: Go Meal Planner ${this.appConfigInfo.version}. ${this.appConfigInfo.copyright}
          </ion-footer>
        </ion-menu>

        <div class="ion-page" id="main-content">
          <ion-header mode="md" class="hide-on-print">
            <ion-toolbar color="primary">
              <ion-buttons slot="start">
                <ion-menu-button>
                  ${this.loadingCount > 0 ? html`<ion-spinner name="bubbles"></ion-spinner>` : html`<app-icon name="menu"></app-icon>`}
                </ion-menu-button>
              </ion-buttons>

              <ion-title slot="start">
                <ion-router-link color="light" href="/">${this.appConfigData.title}</ion-router-link>
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

              <ion-searchbar
                slot="end"
                class="end ion-display-none ion-display-lg-flex"
                .autocorrect=${true}
                .spellcheck=${true}
                .disabled=${!this.isLoggedIn()}
                .value=${this.searchCtx.filter?.query ?? ''}
                @keydown=${(e: KeyboardEvent) => this.onSearchKeyDown(e)}
                @ionBlur=${(e: Event) => ((e.currentTarget as HTMLIonSearchbarElement).value = this.searchCtx.filter?.query ?? '')}
                @ionClear=${() => this.onSearchClearClicked()}
              ></ion-searchbar>
              <ion-buttons slot="end" class="ion-display-none ion-display-lg-flex">
                <ion-button .disabled=${!this.isLoggedIn()} @click=${(e: CustomEvent) => this.onSearchMenuClicked(e)}>
                  <app-icon slot="start" name="manage_search"></app-icon>
                  <ion-badge color="secondary">${this.searchResultCount ?? 0}</ion-badge>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>

            <ion-toolbar color="primary" class="ion-display-lg-none">
              <ion-searchbar
                .autocorrect=${true}
                .spellcheck=${true}
                .disabled=${!this.isLoggedIn()}
                .value=${this.searchCtx.filter?.query ?? ''}
                @keydown=${(e: KeyboardEvent) => this.onSearchKeyDown(e)}
                @ionBlur=${(e: Event) => ((e.currentTarget as HTMLIonSearchbarElement).value = this.searchCtx.filter?.query ?? '')}
                @ionClear=${() => this.onSearchClearClicked()}
              ></ion-searchbar>
              <ion-buttons slot="end">
                <ion-button .disabled=${!this.isLoggedIn()} @click=${(e: CustomEvent) => this.onSearchMenuClicked(e)}>
                  <app-icon slot="start" name="manage_search"></app-icon>
                  <ion-badge color="secondary">${this.searchResultCount ?? 0}</ion-badge>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content>
            <ion-router-outlet></ion-router-outlet>
          </ion-content>
        </div>

        <ion-popover id="search-menu-popover" dismiss-on-select>
          <ion-list lines="none">
            <ion-item button ?disabled=${this.isDefaultSearch()} @click=${() => this.onSearchCancelClicked()}>
              <app-icon slot="start" name="search_off"></app-icon>
              Reset Search
            </ion-item>
            <ion-item button @click=${() => this.onSearchFilterClicked()}>
              <app-icon slot="start" name="search_gear"></app-icon>
              Search Settings
            </ion-item>
          </ion-list>
        </ion-popover>
      </ion-app>
    `;
  }

  async loadAppConfiguration() {
    try {
      const { data: info, error: infoError } = await api.client.GET('/app/info');
      if (infoError != null) {
        throw new Error('Failed to load app info', { cause: infoError });
      }

      const { data: config, error: configError } = await api.client.GET('/app/configuration');
      if (configError != null) {
        throw new Error('Failed to load app configuration', { cause: configError });
      }

      this.appConfigInfo = info;
      this.appConfigData = config;
      this.updateConfigContext();

      document.title = this.appConfigData.title;
      const appName = document.querySelector('meta[name="application-name"]');
      if (appName != null) {
        appName.setAttribute('content', document.title);
      }
      const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appTitle != null) {
        appTitle.setAttribute('content', document.title);
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  private onSearchParamChanged(isPageOnly: boolean) {
    if (!isPageOnly) {
      this.searchCtx.setPage(1);
      this.searchScrollPosition = 0;
    }
    this.updateSearchContext();
    if (this.isLoggedIn()) {
      this.executeSearch().catch(console.error);
    }
  }

  private async executeSearch() {
    if (!this.isLoggedIn()) return;

    const filter = this.searchCtx.filter;
    const page = this.searchCtx.page;
    const count = this.searchCtx.resultsPerPage;

    try {
      const { total, recipes } = await api.performRecipeSearch(filter, page, count);
      this.searchResults = recipes ?? [];
      this.searchResultCount = total;
      this.searchNumPages = Math.max(Math.ceil(total / count), 1);
    } catch (ex) {
      console.error(ex);
      this.searchResults = [];
      this.searchResultCount = undefined;
      this.searchNumPages = 1;
    } finally {
      if (page > this.searchNumPages) {
        this.searchCtx.setPage(this.searchNumPages);
      }
      this.updateSearchContext();
    }

    try {
      this.totalRecipeCount = await api.fetchTotalRecipeCount();
    } catch (ex) {
      console.error(ex);
      this.totalRecipeCount = undefined;
    }

    try {
      this.totalTagsCount = await api.fetchTotalTagsCount();
    } catch (ex) {
      console.error(ex);
      this.totalTagsCount = undefined;
    }

    this.updateStatusContext();
  }

  async logout() {
    this.userStorage.reset();
    this.searchFilterStorage.reset();
    this.searchSettingsStorage.reset();
    this.searchPageStorage.reset();
    this.searchResultsPerPageStorage.reset();
    this.searchResults = undefined;
    this.searchResultCount = undefined;
    this.updateUserContext();
    this.updateSearchContext();

    try {
      const { error } = await api.client.DELETE('/auth');
      if (error != null) {
        throw new Error('Failed to logout.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
    } finally {
      await redirect('/login');
    }
  }

  isLoggedIn() {
    return this.userCtx.user != null;
  }

  private requireLogin() {
    if (this.isLoggedIn()) {
      return true;
    }
    return { redirect: '/login' };
  }

  private isAdmin() {
    return this.isLoggedIn() && isAuthorized(this.userCtx.user, AccessLevel.Admin);
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
    if (match != null) {
      route = match.groups?.base ?? route;
    }

    // Set the page title based on the active page
    const link = this.appLinks.get(route);
    if (link != null) {
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
      if (this.searchResults == null) {
        await this.executeSearch().catch(console.error);
      }
    }

    // Let the new page know it's been activated
    if (this.routerOutlet != null) {
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
      this.searchCtx.setFilter({
        ...this.searchCtx.filter,
        query: searchBar.value?.toString() ?? ''
      });
      await redirect('/recipes');
    }
  }

  private async onSearchMenuClicked(e: CustomEvent) {
    if (!this.isLoggedIn()) {
      return;
    }

    await this.searchMenuPopover?.present(e);
  }

  private async onSearchClearClicked() {
    if (!this.isLoggedIn()) {
      return;
    }

    this.searchCtx.setFilter({
      ...this.searchCtx.filter,
      query: ''
    });
    await redirect('/recipes');
  }

  private async onSearchCancelClicked() {
    if (!this.isLoggedIn()) {
      return;
    }

    this.searchCtx.setFilter(getDefaultSearchFilter());
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
        searchFilter: this.searchCtx.filter
      },
    });
    if (data != null) {
      this.searchCtx.setFilter(data.searchFilter);
      await redirect('/recipes');
    }
  }

  private isDefaultSearch() {
    const defaultFilter = getDefaultSearchFilter();
    const currentFilter = {
      ...defaultFilter,
      ...this.searchCtx.filter
    };
    return JSON.stringify(defaultFilter) === JSON.stringify(currentFilter);
  }
}
