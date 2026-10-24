import { actionSheetController, alertController, modalController, popoverController, RouterEventDetail } from '@ionic/core';
import { Component, Element, h, State } from '@stencil/core';
import { AccessLevel, SearchFilter } from '../../helpers/schema.gen';
import { api, refreshSearchResults } from '../../helpers/api';
import { showModal } from '../../helpers/modals';
import { redirect, sendActivatedCallback, isNull, isNullOrEmpty, isAuthorized } from '../../helpers/utils';
import { getDefaultSearchFilter } from '../../models';
import appConfig from '../../stores/config';
import state, { clearState } from '../../stores/state';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
  tag: 'app-root',
  styleUrl: 'app-root.css',
})
export class AppRoot {
  @Element() el!: HTMLAppRootElement;
  private routerOutlet!: HTMLIonRouterOutletElement;
  private menu!: HTMLIonMenuElement;
  private readonly subscriptions: Subscription[] = [];

  /* eslint-disable @typescript-eslint/no-unused-vars */
  private readonly appLinks: Map<string, {
    title: string;
    icon: string;
    showOn: (type: 'menu' | 'toolbar') => boolean;
    detail?: () => number;
    parentUrl?: string
  }> = new Map([
    ['/', { title: 'Home', icon: 'home', showOn: (type) => type === 'menu' }],
    ['/recipes', { title: 'Recipes', icon: 'restaurant', showOn: (type) => this.isLoggedIn(), detail: () => state.totalRecipeCount ?? 0 }],
    ['/tags', { title: 'Tags', icon: 'bookmarks', showOn: (type) => this.isLoggedIn(), detail: () => state.totalTagsCount ?? 0 }],
    ['/settings', { title: 'Settings', icon: 'settings', showOn: (type) => this.isLoggedIn() }],
    ['/settings/preferences', { title: 'Preferences', icon: 'options', showOn: (type) => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/settings/searches', { title: 'Searches', icon: 'search', showOn: (type) => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/settings/security', { title: 'Security', icon: 'finger-print', showOn: (type) => type === 'menu' && this.isLoggedIn(), parentUrl: '/settings' }],
    ['/admin', { title: 'Admin', icon: 'shield-checkmark', showOn: (type) => this.isAdmin() }],
    ['/admin/configuration', { title: 'Configuration', icon: 'document-text', showOn: (type) => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
    ['/admin/users', { title: 'Users', icon: 'people', showOn: (type) => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
    ['/admin/maintenance', { title: 'Maintenance', icon: 'build', showOn: (type) => type === 'menu' && this.isAdmin(), parentUrl: '/admin' }],
  ]);
  /* eslint-enable @typescript-eslint/no-unused-vars */

  @State() pageTitle: string = '';
  @State() childPageTitle: string = '';

  connectedCallback() {
    // Automatically trigger a logout if an API returns a 401
    this.subscriptions.push(api.responses.subscribe(async ({ request, response }) => {
      if (response.status === 401) {
        // Make sure we don't recursively call ourselves if the logout also triggers a 401
        if (!request.url.endsWith('/auth') || request.method.toLowerCase() !== 'delete') {
          await this.logout();
        }
      }
    }));
  }

  disconnectedCallback() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async componentWillLoad() {
    await this.loadAppConfiguration();
  }

  render() {
    return (
      <ion-app>
        <ion-router useHash={false}
          onIonRouteWillChange={() => this.onPageChanging()}
          onIonRouteDidChange={(e: CustomEvent<RouterEventDetail>) => this.onPageChanged(e)}>
          <ion-route url="/login" component="page-login" />

          <ion-route url="/" component="page-home" beforeEnter={() => this.requireLogin()} />

          {/* Redirect legacy search URL for backward compatibility in case users have bookmarks */}
          <ion-route-redirect from="/search" to="/recipes" />
          <ion-route url="/recipes" component="ion-router-outlet" beforeEnter={() => this.requireLogin()}>
            <ion-route component="page-search" />
            <ion-route url="/:recipeId" component="page-recipe" />
          </ion-route>

          <ion-route url="/tags" component="page-tags" beforeEnter={() => this.requireLogin()} />

          <ion-route-redirect from="/settings" to="/settings/preferences" />
          <ion-route url="/settings" component="page-settings" beforeEnter={() => this.requireLogin()}>
            <ion-route url="/preferences" component="tab-settings-preferences" />
            <ion-route url="/searches" component="tab-settings-searches" />
            <ion-route url="/security" component="tab-settings-security" />
          </ion-route>

          <ion-route-redirect from="/admin" to="/admin/configuration" />
          <ion-route url="/admin" component="page-admin" beforeEnter={() => this.requireAdmin()}>
            <ion-route url="/configuration" component="tab-admin-configuration" />
            <ion-route url="/users" component="tab-admin-users" />
            <ion-route url="/maintenance" component="tab-admin-maintenance" />
          </ion-route>
        </ion-router>

        <ion-menu side="start" type="reveal" content-id="main-content" ref={el => this.menu = el!}>
          <ion-content>
            <ion-list class="ion-no-padding">
              {Array.from(this.appLinks.entries())
                .filter(([, link]) => link.showOn('menu'))
                .map(([url, link]) => {
                  const isActive = this.pageTitle === link.title || this.childPageTitle === link.title;
                  const isParentOfActive = this.pageTitle === link.title && !isNullOrEmpty(this.childPageTitle);
                  return (
                    <ion-item
                      key={url}
                      href={url}
                      color={isActive && !isParentOfActive ? 'secondary' : undefined}
                      detail={isActive && !isParentOfActive}
                      class={{ 'active': isActive, 'child-link': !isNullOrEmpty(link.parentUrl) }}
                    >
                      <ion-icon name={link.icon} slot="start" color={isParentOfActive ? 'secondary' : undefined} />
                      <ion-label color={isParentOfActive ? 'secondary' : undefined}>{link.title}</ion-label>
                      {!isNull(link.detail) && <ion-label slot="end">{link.detail()}</ion-label>}
                    </ion-item>
                  );
                })}
              <ion-item button onClick={() => this.logout()}>
                <ion-icon name="log-out" slot="start" />
                <ion-label>Logout</ion-label>
              </ion-item>
            </ion-list>
          </ion-content>

          <ion-footer color="medium" class="ion-text-center ion-padding copyright">
            GOMP: Go Meal Planner {appConfig.info.version}. {appConfig.info.copyright}
          </ion-footer>
        </ion-menu>

        <div class="ion-page" id="main-content">
          <ion-header mode="md" class="hide-on-print">
            <ion-toolbar color="primary">
              <ion-buttons slot="start">
                <ion-menu-button>
                  {state.loadingCount > 0 &&
                    <ion-spinner name="bubbles" />
                  }
                </ion-menu-button>
              </ion-buttons>

              <ion-title slot="start">
                <ion-router-link color="light" href="/">{appConfig.config.title}</ion-router-link>
                {!isNullOrEmpty(this.pageTitle) && <ion-text color="light" class="ion-display-md-none"> | {this.pageTitle}</ion-text>}
              </ion-title>

              <ion-buttons id="toolbar-menu" slot="end" class="ion-display-none ion-display-sm-flex">
                {Array.from(this.appLinks.entries())
                  .filter(([, link]) => link.showOn('toolbar'))
                  .map(([url, link]) => ([
                    <ion-button
                      key={url}
                      size="small"
                      fill={this.pageTitle === link.title ? 'solid' : 'clear'}
                      class={{ 'active': this.pageTitle === link.title, 'ion-display-none': true, 'ion-display-md-flex': true }}
                      href={url}
                      title={link.title}
                    >
                      <ion-icon slot="start" icon={link.icon} />
                      {link.title}
                    </ion-button>,
                    <ion-button
                      key={url}
                      size="small"
                      fill={this.pageTitle === link.title ? 'solid' : 'clear'}
                      class={{ 'active': this.pageTitle === link.title, 'ion-display-md-none': true }}
                      href={url}
                      title={link.title}
                    >
                      <ion-icon slot="icon-only" icon={link.icon} size="small" />
                    </ion-button>
                  ]))
                }
              </ion-buttons>

              <ion-searchbar
                slot="end"
                class="end ion-display-none ion-display-lg-flex"
                // @ts-expect-error - TS 5.9 + Ionic v9 type conflict
                autocorrect={true}
                spellcheck={true}
                disabled={!this.isLoggedIn()}
                show-cancel-button={this.isDefaultSearch() ? 'never' : 'always'}
                cancel-button-text="Reset"
                cancel-button-icon="arrow-undo-outline"
                value={state.searchFilter?.query}
                onKeyDown={(e: KeyboardEvent) => this.onSearchKeyDown(e)}
                onIonBlur={(e: Event) => (e.currentTarget as HTMLIonSearchbarElement).value = state.searchFilter?.query ?? ''}
                onIonClear={() => this.onSearchClearClicked()}
                onIonCancel={() => this.onSearchCancelClicked()}
              />
              <ion-buttons slot="end" class="ion-display-none ion-display-lg-flex">
                <ion-button color="light" disabled={!this.isLoggedIn()} onClick={() => this.onSearchFilterClicked()}>
                  <ion-icon icon="filter" slot="start" />
                  <ion-badge color="secondary">{state.searchResultCount}</ion-badge>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
            <ion-toolbar color="primary" class="ion-display-lg-none">
              <ion-searchbar
                // @ts-expect-error - TS 5.9 + Ionic v9 type conflict
                autocorrect={true}
                spellcheck={true}
                disabled={!this.isLoggedIn()}
                show-cancel-button={this.isDefaultSearch() ? 'never' : 'always'}
                cancel-button-text="Reset"
                cancel-button-icon="arrow-undo-outline"
                value={state.searchFilter?.query}
                onKeyDown={(e: KeyboardEvent) => this.onSearchKeyDown(e)}
                onIonBlur={(e: Event) => (e.currentTarget as HTMLIonSearchbarElement).value = state.searchFilter?.query ?? ''}
                onIonClear={() => this.onSearchClearClicked()}
                onIonCancel={() => this.onSearchCancelClicked()}
              />
              <ion-buttons slot="end">
                <ion-button color="light" disabled={!this.isLoggedIn()} onClick={() => this.onSearchFilterClicked()}>
                  <ion-icon icon="filter" slot="start" />
                  <ion-badge color="secondary">{state.searchResultCount}</ion-badge>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content>
            <ion-router-outlet ref={el => this.routerOutlet = el!} />
          </ion-content>
        </div>
      </ion-app>
    );
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
        throw new Error('Failed to logout.', { cause: error })
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
    // Close any and all modals
    const controllers = [
      actionSheetController,
      alertController,
      modalController,
      popoverController
    ];
    await Promise.all(controllers.map(controller => controller.dismiss().catch(() => { })));
  }

  private async onPageChanging() {
    await this.menu.close();
  }

  private async onPageChanged(e: CustomEvent<RouterEventDetail>) {
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
      if (isNull(state.searchResults)) {
        await refreshSearchResults().catch(console.error);
      }
    }

    // Let the new page know it's been activated
    await sendActivatedCallback(this.routerOutlet);

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
      presentingElement: this.el,
      component: 'search-filter-editor',
      componentProps: {
        saveLabel: 'Search',
        prompt: 'Search',
        hideName: true,
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
