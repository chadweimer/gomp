import { actionSheetController, alertController, modalController, pickerController, popoverController } from '@ionic/core';
import { Component, Element, h, Listen, State } from '@stencil/core';
import { AppApi, UsersApi } from '../../helpers/api';
import { hasAccessLevel, redirect, enableBackForOverlay } from '../../helpers/utils';
import { AccessLevel, DefaultSearchFilter, DefaultSearchSettings, SearchFilter } from '../../models';
import state from '../../store';

@Component({
  tag: 'app-root',
  styleUrl: 'app-root.css',
})
export class AppRoot {
  @State() loadingCount = 0;

  @Element() el!: HTMLAppRootElement;
  private nav!: HTMLIonNavElement;
  private menu!: HTMLIonMenuElement;
  private searchBar!: HTMLIonInputElement;

  async componentWillLoad() {
    await this.loadAppConfiguration();
  }

  render() {
    return (
      <ion-app>
        <ion-router useHash={false} onIonRouteWillChange={() => this.onPageChanging()} onIonRouteDidChange={() => this.onPageChanged()}>
          <ion-route url="/login" component="page-login" />

          <ion-route url="/" component="page-home" beforeEnter={() => this.requireLogin()} />

          <ion-route url="/recipes" component="page-search" beforeEnter={() => this.requireLogin()} />

          <ion-route url="/recipes/:recipeId" component="page-recipe" beforeEnter={() => this.requireLogin()} />

          <ion-route url="/settings" component="page-settings" beforeEnter={() => this.requireLogin()}>
            <ion-route component="tab-settings-preferences" beforeEnter={() => this.requireLogin()} />
            <ion-route url="/preferences" component="tab-settings-preferences" beforeEnter={() => this.requireLogin()} />
            <ion-route url="/searches" component="tab-settings-searches" beforeEnter={() => this.requireLogin()} />
            <ion-route url="/security" component="tab-settings-security" beforeEnter={() => this.requireLogin()} />
          </ion-route>

          <ion-route url="/admin" component="page-admin" beforeEnter={() => this.requireAdmin()}>
            <ion-route component="tab-admin-configuration" beforeEnter={() => this.requireAdmin()} />
            <ion-route url="/configuration" component="tab-admin-configuration" beforeEnter={() => this.requireAdmin()} />
            <ion-route url="/users" component="tab-admin-users" beforeEnter={() => this.requireAdmin()} />
          </ion-route>
        </ion-router>

        <ion-menu side="start" content-id="main-content" ref={el => this.menu = el}>
          <ion-content>
            <ion-list>
              <ion-item href="/" lines="none">
                <ion-icon name="home" slot="start" />
                <ion-label>Home</ion-label>
              </ion-item>
              <ion-item href="/recipes" lines="full">
                <ion-icon name="restaurant" slot="start" />
                <ion-label>Recipes</ion-label>
                <ion-badge slot="end" color="secondary">{state.searchResultCount}</ion-badge>
              </ion-item>
              <ion-item href="/settings" lines="full">
                <ion-icon name="settings" slot="start" />
                <ion-label>Settings</ion-label>
              </ion-item>
              {hasAccessLevel(state.currentUser, AccessLevel.Administrator) ?
                <ion-item href="/admin" lines="full">
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
            <div class="copyright">GOMP: Go Meal Plannner {state.appInfo.version}. Copyright © 2016-2021 Chad Weimer</div>
          </ion-footer>
        </ion-menu>

        <div class="ion-page" id="main-content">
          <ion-header>
            <ion-toolbar color="primary">
              {hasAccessLevel(state.currentUser, AccessLevel.Viewer) ?
                <ion-buttons slot="start">
                  <ion-menu-button class="ion-hide-lg-up" />
                </ion-buttons>
                : ''}

              <ion-title slot="start" class={{ ['ion-hide-sm-down']: hasAccessLevel(state.currentUser, AccessLevel.Viewer) }}>
                <ion-router-link href="/" class="contrast">{state.appConfig.title}</ion-router-link>
              </ion-title>

              {hasAccessLevel(state.currentUser, AccessLevel.Viewer) ? [
                <ion-buttons slot="end">
                  <ion-button href="/" class="ion-hide-lg-down">Home</ion-button>
                  <ion-button href="/recipes" class="ion-hide-lg-down">
                    Recipes
                    <ion-badge slot="end" color="secondary">{state.searchResultCount}</ion-badge>
                  </ion-button>
                  <ion-button href="/settings" class="ion-hide-lg-down">Settings</ion-button>
                  {hasAccessLevel(state.currentUser, AccessLevel.Administrator) ?
                    <ion-button href="/admin" class="ion-hide-lg-down">Admin</ion-button>
                    : ''}
                  <ion-button class="ion-hide-lg-down" onClick={() => this.logout()}>Logout</ion-button>
                </ion-buttons>,
                <ion-item slot="end" lines="none">
                  <ion-icon icon="search" slot="start" />
                  <ion-input type="search" placeholder="Search" value={state.searchFilter?.query} onKeyDown={e => this.onSearchKeyDown(e)} ref={el => this.searchBar = el} />
                  <ion-buttons slot="end" class="ion-no-margin">
                    <ion-button color="medium" onClick={() => this.onSearchClearClicked()}><ion-icon icon="close" slot="icon-only" /></ion-button>
                    <ion-button color="medium" onClick={() => this.onSearchFilterClicked()}><ion-icon icon="options" slot="icon-only" /></ion-button>
                  </ion-buttons>
                </ion-item>
              ] : ''}
            </ion-toolbar>
            {this.loadingCount > 0 ?
              <ion-progress-bar type="indeterminate" color="secondary" />
              :
              <ion-progress-bar value={100} color="primary" />
            }
          </ion-header>

          <ion-content>
            <ion-nav animated={false} ref={el => this.nav = el} />
          </ion-content>
        </div>
      </ion-app>
    );
  }

  @Listen('popstate', { target: 'window' })
  async onWindowPopState() {
    await this.closeAllOverlays();
  }

  @Listen('ajax-presend')
  onAjaxPresend() {
    this.loadingCount++;
  }

  @Listen('ajax-response')
  onAjaxResponse() {
    if (this.loadingCount > 0) {
      this.loadingCount--;
    }
  }

  @Listen('ajax-error')
  onAjaxError(e: CustomEvent) {
    if (this.loadingCount > 0) {
      this.loadingCount--;
    }
    if (e.detail.response?.status === 401) {
      this.logout();
    }
  }

  private async loadAppConfiguration() {
    try {
      state.appInfo = await AppApi.getInfo(this.el);
      state.appConfig = await AppApi.getConfiguration(this.el);

      document.title = state.appConfig.title;
      const appName = document.querySelector('meta[name="application-name"]');
      if (appName) {
        appName.setAttribute('content', document.title);
      }
      const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appTitle) {
        appTitle.setAttribute('content', document.title);
      }
    } catch (ex) {
      console.error(ex);
    }
  }

  private async logout() {
    state.jwtToken = null;
    state.currentUser = null;
    state.currentUserSettings = null;
    state.searchFilter = new DefaultSearchFilter();
    state.searchSettings = new DefaultSearchSettings();
    state.searchPage = 1;
    state.searchResultCount = null;
    await redirect('/login');
  }

  private isLoggedIn() {
    return !!state.jwtToken;
  }

  private async requireLogin() {
    if (this.isLoggedIn()) {
      // Refresh the user so that access controls are properly enforced
      try {
        state.currentUser = await UsersApi.get(this.el);
        state.currentUserSettings = await UsersApi.getSettings(this.el);
      } catch (ex) {
        console.error(ex);
      }
      return true;
    }

    return { redirect: '/login' };
  }

  private async requireAdmin() {
    const loginCheck = await this.requireLogin();
    if (loginCheck !== true) {
      return loginCheck;
    }

    if (state.currentUser?.accessLevel === AccessLevel.Administrator) {
      return true;
    }

    return { redirect: '/' };
  }

  private async performSearch() {
    state.searchPage = 1;

    const activePage = await this.nav.getActive();
    if (activePage?.component === 'page-search') {
      // If the active page is the search page, perform the search right away
      const el = activePage.element as HTMLPageSearchElement;
      await el.performSearch();
    } else {
      // Otherwise, redirect to it
      await redirect('/recipes');
    }
  }

  private async closeAllOverlays() {
    // Close any and all modals
    const controllers = [
      actionSheetController,
      alertController,
      modalController,
      pickerController,
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
    const activePage = await this.nav.getActive();
    const el = activePage?.element as any;
    if (el && typeof el.deactivatingCallback === 'function') {
      el.deactivatingCallback();
    }

    // Refresh the user so that access controls are properly enforced
    if (this.isLoggedIn()) {
      try {
        state.currentUser = await UsersApi.get(this.el);
        state.currentUserSettings = await UsersApi.getSettings(this.el);
      } catch (ex) {
        console.error(ex);
      }
    }
  }

  private async onPageChanged() {
    // Let the new page know it's been activated
    const activePage = await this.nav.getActive();
    const el = activePage?.element as any;
    if (el && typeof el.activatedCallback === 'function') {
      el.activatedCallback();
    }

    await this.closeAllOverlays();
  }

  private async onSearchKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      state.searchFilter = {
        ...state.searchFilter,
        query: this.searchBar.value?.toString()
      };
      await this.performSearch();
    }
  }

  private async onSearchClearClicked() {
    state.searchFilter = new DefaultSearchFilter();
    await this.performSearch();
  }

  private async onSearchFilterClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'search-filter-editor',
        componentProps: {
          prompt: 'Search',
          showName: false
        },
        animated: false,
      });
      await modal.present();

      // Workaround for auto-grow textboxes in a dialog.
      // Set this only after the dialog has presented,
      // instead of using component props
      modal.querySelector('search-filter-editor').searchFilter = state.searchFilter;

      const resp = await modal.onDidDismiss<{ dismissed: boolean, searchFilter: SearchFilter }>();
      if (resp.data?.dismissed === false) {
        state.searchFilter = resp.data.searchFilter;
        await this.performSearch();
      }
    });
  }
}
