import { actionSheetController, alertController, modalController, popoverController, RouterEventDetail } from '@ionic/core';
import { Component, Element, h, Listen, State } from '@stencil/core';
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
            <ion-list>
              <ion-item class={{ active: this.pageTitle === 'Home' }} href="/" lines="none">
                <ion-icon name="home" slot="start" />
                <ion-label>Home</ion-label>
              </ion-item>
              <ion-item class={{ active: this.pageTitle === 'Recipes' }} href="/recipes" lines="none">
                <ion-icon name="restaurant" slot="start" />
                <ion-label>Recipes</ion-label>
                <ion-badge slot="end" color="secondary">{state.searchResultCount}</ion-badge>
              </ion-item>
              <ion-item class={{ active: this.pageTitle === 'Tags' }} href="/tags" lines="full">
                <ion-icon name="bookmark" slot="start" />
                <ion-label>Tags</ion-label>
              </ion-item>
              <ion-item class={{ active: this.pageTitle === 'Settings' }} href="/settings" lines="full">
                <ion-icon name="settings" slot="start" />
                <ion-label>Settings</ion-label>
              </ion-item>
              {hasScope(state.jwtToken, AccessLevel.Admin) ?
                <ion-item class={{ active: this.pageTitle === 'Admin' }} href="/admin" lines="full">
                  <ion-icon name="shield-checkmark" slot="start" />
                  <ion-label>Admin</ion-label>
                </ion-item>
                : ''}
              <ion-item lines="none" button onClick={() => this.logout()}>
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
                  <ion-button class={{ active: this.pageTitle === 'Home' }} color="light" href="/">Home</ion-button>
                  <ion-button class={{ active: this.pageTitle === 'Recipes' }} color="light" href="/recipes">
                    Recipes
                    <ion-badge slot="end" color="secondary">{state.searchResultCount}</ion-badge>
                  </ion-button>
                  <ion-button class={{ active: this.pageTitle === 'Tags' }} color="light" href="/tags">Tags</ion-button>
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
    // Set the page title
    if (e.detail.to === '/') {
      this.pageTitle = 'Home';
    } else if (e.detail.to.startsWith('/recipes')) {
      this.pageTitle = 'Recipes';
    } else if (e.detail.to.startsWith('/tags')) {
      this.pageTitle = 'Tags';
    } else if (e.detail.to.startsWith('/settings')) {
      this.pageTitle = 'Settings';
    } else if (e.detail.to.startsWith('/admin')) {
      this.pageTitle = 'Admin';
    } else {
      this.pageTitle = '';
    }

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
