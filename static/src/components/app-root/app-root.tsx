import { actionSheetController, alertController, modalController, popoverController, RouterEventDetail } from '@ionic/core';
import { Component, Element, Fragment, h, Listen, State } from '@stencil/core';
import { AccessLevel, SearchFilter } from '../../generated';
import { appApi, refreshSearchResults } from '../../helpers/api';
import { redirect, enableBackForOverlay, sendDeactivatingCallback, sendActivatedCallback, hasScope, isNull, isNullOrEmpty } from '../../helpers/utils';
import { getDefaultSearchFilter } from '../../models';
import appConfig from '../../stores/config';
import state, { clearState } from '../../stores/state';
import { NavigationHookResult } from '@ionic/core/dist/types/components/route/route-interface';

@Component({
  tag: 'app-root',
  styleUrl: 'app-root.css',
})
export class AppRoot {
  @Element() el!: HTMLAppRootElement;
  private routerOutlet!: HTMLIonRouterOutletElement;
  private menu!: HTMLIonMenuElement;

  private readonly appLinks = [
    { url: '/', title: 'Home', icon: 'home', toolbar: true },
    { url: '/recipes', title: 'Recipes', icon: 'restaurant', toolbar: true, detail: () => state.searchResultCount },
    { url: '/tags', title: 'Tags', icon: 'bookmarks', toolbar: true },
    {
      url: '/settings',
      title: 'Settings',
      icon: 'settings',
      toolbar: false,
      children: [
        { url: '/settings/preferences', title: 'Preferences', icon: 'options' },
        { url: '/settings/searches', title: 'Searches', icon: 'search' },
        { url: '/settings/security', title: 'Security', icon: 'finger-print' }
      ]
    },
    {
      url: '/admin',
      title: 'Admin',
      icon: 'shield-checkmark',
      toolbar: false,
      access: AccessLevel.Admin,
      children: [
        { url: '/admin/configuration', title: 'Configuration', icon: 'document-text' },
        { url: '/admin/users', title: 'Users', icon: 'people' },
        { url: '/admin/maintenance', title: 'Maintenance', icon: 'build' }
      ]
    }
  ];

  @State() pageTitle: string = '';

  async componentWillLoad() {
    // Automatically trigger a logout if an API returns a 401
    const { fetch: originalFetch } = window;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      if (response.status === 401) {
        await this.logout();
      }
      return response;
    };

    await this.loadAppConfiguration();
  }

  render() {
    return (
      <ion-app>
        <ion-router useHash={false} onIonRouteWillChange={() => this.onPageChanging()} onIonRouteDidChange={(e) => this.onPageChanged(e)}>
          <ion-route url="/login" component="page-login" />

          <ion-route url="/" component="page-home" beforeEnter={() => this.requireLogin()} />

          <ion-route url="/recipes" component="ion-router-outlet" beforeEnter={() => this.requireLogin()}>
            <ion-route component="page-search" />
            <ion-route url="/:recipeId" component="page-recipe" />
          </ion-route>

          <ion-route url="/tags" component="page-tags" beforeEnter={() => this.requireLogin()} />

          <ion-route url="/settings" component="page-settings" beforeEnter={() => this.requireLogin()}>
            <ion-route component="tab-settings-preferences" />
            <ion-route url="/preferences" component="tab-settings-preferences" />
            <ion-route url="/searches" component="tab-settings-searches" />
            <ion-route url="/security" component="tab-settings-security" />
          </ion-route>

          <ion-route url="/admin" component="page-admin" beforeEnter={() => this.requireAdmin()}>
            <ion-route component="tab-admin-configuration" />
            <ion-route url="/configuration" component="tab-admin-configuration" />
            <ion-route url="/users" component="tab-admin-users" />
            <ion-route url="/maintenance" component="tab-admin-maintenance" />
          </ion-route>
        </ion-router>

        <ion-menu side="start" type="reveal" content-id="main-content" ref={el => this.menu = el}>
          <ion-content>
            <ion-list class="ion-no-padding">
              {this.appLinks
                .filter(link => isNull(link.access) || hasScope(state.jwtToken, link.access))
                .map(link =>
                  <Fragment>
                    <ion-item
                      href={link.url}
                      color={this.pageTitle === link.title ? 'dark' : ''}
                      detail={this.pageTitle === link.title}
                    >
                      <ion-icon name={link.icon} slot="start" />
                      <ion-label>{link.title}</ion-label>
                      {!isNull(link.detail) && <ion-label slot="end">{link.detail()}</ion-label>}
                    </ion-item>
                    {link.children?.length > 0 &&
                      <ion-list class="ion-no-padding child-links">
                        {link.children.map(child =>
                          <ion-item
                            href={child.url}
                            color={this.pageTitle === child.title ? 'dark' : ''}
                            detail={this.pageTitle === child.title}
                          >
                            <ion-icon name={child.icon} slot="start" />
                            <ion-label>{child.title}</ion-label>
                          </ion-item>
                        )}
                      </ion-list>
                    }
                  </Fragment>
                )}
              <ion-item button onClick={() => this.logout()}>
                <ion-icon name="log-out" slot="start" />
                <ion-label>Logout</ion-label>
              </ion-item>
            </ion-list>
          </ion-content>

          <ion-footer color="medium" class="ion-text-center ion-padding">
            <div class="copyright">GOMP: Go Meal Planner {appConfig.info.version}. {appConfig.info.copyright}</div>
          </ion-footer>
        </ion-menu>

        <div class="ion-page" id="main-content">
          <ion-header mode="md">
            <ion-toolbar color="primary">
              {hasScope(state.jwtToken, AccessLevel.Viewer) ?
                <ion-buttons slot="start">
                  <ion-menu-button />
                </ion-buttons>
                : ''}

              <ion-title slot="start">
                <ion-router-link color="light" href="/">{appConfig.config.title}</ion-router-link>
                {!isNullOrEmpty(this.pageTitle) ? <ion-text color="light"> | {this.pageTitle}</ion-text> : ''}
              </ion-title>

              {hasScope(state.jwtToken, AccessLevel.Viewer) ?
                <ion-buttons slot="end" class="ion-hide-md-down">
                  {this.appLinks
                    .filter(link => link.toolbar && (isNull(link.access) || hasScope(state.jwtToken, link.access)))
                    .map(link => (
                      <ion-button
                        class={{ active: this.pageTitle === link.title }}
                        href={link.url}
                      >
                        {link.title}
                        {!isNull(link.detail) && <ion-badge slot="end" color="secondary">{link.detail()}</ion-badge>}
                      </ion-button>
                    ))
                  }
                </ion-buttons>
                : ''}
              {hasScope(state.jwtToken, AccessLevel.Viewer) ?
                <ion-searchbar
                  slot="end"
                  class="end ion-hide-md-down"
                  autocorrect="on"
                  spellcheck={true}
                  value={state.searchFilter?.query}
                  onKeyDown={e => this.onSearchKeyDown(e)}
                  onIonBlur={e => e.target.value = state.searchFilter?.query ?? ''}
                  onIonClear={() => this.onSearchClearClicked()}
                ></ion-searchbar>
                : ''}
              {hasScope(state.jwtToken, AccessLevel.Viewer) ?
                <ion-buttons slot="end" class="ion-hide-md-down">
                  <ion-button color="light" onClick={() => this.onSearchFilterClicked()}><ion-icon icon="filter" slot="icon-only" /></ion-button>
                </ion-buttons>
                : ''}
            </ion-toolbar>
            {hasScope(state.jwtToken, AccessLevel.Viewer) ?
              <ion-toolbar color="primary" class="ion-hide-md-up">
                <ion-searchbar
                  autocorrect="on"
                  spellcheck={true}
                  value={state.searchFilter?.query}
                  onKeyDown={e => this.onSearchKeyDown(e)}
                  onIonBlur={e => e.target.value = state.searchFilter?.query ?? ''}
                  onIonClear={() => this.onSearchClearClicked()}
                ></ion-searchbar>
                <ion-buttons slot="end">
                  <ion-button color="light" onClick={() => this.onSearchFilterClicked()}><ion-icon icon="filter" slot="icon-only" /></ion-button>
                </ion-buttons>
              </ion-toolbar>
              : ''}
            {state.loadingCount > 0 ?
              <ion-progress-bar type="indeterminate" color="secondary" />
              :
              <ion-progress-bar value={100} color="primary" />
            }
          </ion-header>

          <ion-content>
            <ion-router-outlet ref={el => this.routerOutlet = el} />
          </ion-content>
        </div>
      </ion-app>
    );
  }

  @Listen('popstate', { target: 'window' })
  async onWindowPopState() {
    await this.closeAllOverlays();
  }

  private async loadAppConfiguration() {
    try {
      appConfig.info = await appApi.getInfo();
      appConfig.config = await appApi.getConfiguration();

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
    await redirect('/login');
  }

  private isLoggedIn() {
    return !isNullOrEmpty(state.jwtToken);
  }

  private requireLogin(): NavigationHookResult {
    if (this.isLoggedIn()) {
      return true;
    }

    return { redirect: '/login' };
  }

  private requireAdmin(): NavigationHookResult {
    if (hasScope(state.jwtToken, AccessLevel.Admin)) {
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
    for (const controller of controllers) {
      try {
        await controller.dismiss();
      } catch {
        // Nothing to do here. There might not have been something open
      }
    }
  }

  private async onPageChanging() {
    this.menu.close();
    // Let the current page know it's being deactivated
    await sendDeactivatingCallback(this.routerOutlet);
  }

  private async onPageChanged(e: CustomEvent<RouterEventDetail>) {
    // Set the page title based on the active page
    let activeTitle = '';
    for (const link of this.appLinks) {
      if (link.url === e.detail.to) {
        activeTitle = link.title;
        break;
      }
      if (link.children?.length > 0) {
        const child = link.children.find(child => child.url === e.detail.to);
        if (!isNull(child)) {
          activeTitle = child.title;
          break;
        }
      }
    }
    this.pageTitle = activeTitle;

    if (this.isLoggedIn()) {
      // Make sure there are search results on initial load
      if (isNull(state.searchResults)) {
        await refreshSearchResults();
      }
    }

    // Let the new page know it's been activated
    await sendActivatedCallback(this.routerOutlet);

    await this.closeAllOverlays();
  }

  private async onSearchKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const searchBar = e.target as HTMLIonInputElement;
      state.searchFilter = {
        ...state.searchFilter,
        query: searchBar.value?.toString()
      };
      await redirect('/recipes');
    }
  }

  private async onSearchClearClicked() {
    state.searchFilter = getDefaultSearchFilter();
    await redirect('/recipes');
  }

  private async onSearchFilterClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'search-filter-editor',
        componentProps: {
          saveLabel: 'Search',
          prompt: 'Search',
          hideName: true,
          showSavedLoader: true,
          searchFilter: state.searchFilter
        },
        animated: false,
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ searchFilter: SearchFilter }>();
      if (!isNull(data)) {
        state.searchFilter = data.searchFilter;
        await redirect('/recipes');
      }
    });
  }
}
