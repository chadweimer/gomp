import { actionSheetController, alertController, modalController, pickerController, popoverController } from '@ionic/core';
import { Component, Element, h, Listen, State } from '@stencil/core';
import { AppApi, UsersApi } from '../../helpers/api';
import { hasAccessLevel, redirect } from '../../helpers/utils';
import { AccessLevel } from '../../models';
import state from '../../store';

@Component({
  tag: 'app-root',
  styleUrl: 'app-root.css',
})
export class AppRoot {
  @State() loadingCount = 0;

  @Element() el: HTMLAppRootElement;
  private nav: HTMLIonNavElement;
  private menu: HTMLIonMenuElement;
  private searchBar: HTMLIonSearchbarElement;

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

          <ion-route url="/recipes/:recipeId/view" component="page-recipe" beforeEnter={() => this.requireLogin()} />

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
              </ion-item>
              <ion-item href="/settings" lines="full">
                <ion-icon name="settings" slot="start" />
                <ion-label>Settings</ion-label>
              </ion-item>
              <ion-item href="/admin" lines="full" hidden={!hasAccessLevel(state.currentUser, AccessLevel.Administrator)}>
                <ion-icon name="shield-checkmark" slot="start" />
                <ion-label>Admin</ion-label>
              </ion-item>
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
              <ion-buttons slot="start" hidden={!hasAccessLevel(state.currentUser, AccessLevel.Viewer)}>
                <ion-menu-button class="ion-hide-lg-up" />
              </ion-buttons>

              <ion-title slot="start" class="ion-hide-sm-down">{state.appConfig.title}</ion-title>

              <ion-buttons slot="end" hidden={!hasAccessLevel(state.currentUser, AccessLevel.Viewer)}>
                <ion-button href="/" class="ion-hide-lg-down">Home</ion-button>
                <ion-button href="/recipes" class="ion-hide-lg-down">Recipes <ion-badge>99</ion-badge></ion-button>
                <ion-button href="/settings" class="ion-hide-lg-down">Settings</ion-button>
                <ion-button href="/admin" class="ion-hide-lg-down" hidden={!hasAccessLevel(state.currentUser, AccessLevel.Administrator)}>Admin</ion-button>
                <ion-button class="ion-hide-lg-down" onClick={() => this.logout()}>Logout</ion-button>
                <ion-searchbar show-clear-button="always" value={state.searchFilter?.query} onKeyDown={e => this.onSearchKeyDown(e)} onIonClear={() => this.onSearchClear()} ref={el => this.searchBar = el} />
              </ion-buttons>
            </ion-toolbar>
            <ion-progress-bar type="indeterminate" color="secondary" hidden={this.loadingCount === 0} />
          </ion-header>

          <ion-content>
            <ion-nav animated={false} ref={el => this.nav = el} />
          </ion-content>
        </div>
      </ion-app>
    );
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
    await redirect('/login');
  }

  private isLoggedIn() {
    return !!state.jwtToken;
  }

  private requireLogin() {
    if (this.isLoggedIn()) {
      return true;
    }

    return { redirect: '/login' };
  }

  private requireAdmin() {
    const loginCheck = this.requireLogin();
    if (loginCheck !== true) {
      return loginCheck;
    }

    if (state.currentUser?.accessLevel === AccessLevel.Administrator) {
      return true;
    }

    return { redirect: '/' };
  }

  private async performSearch(query: string) {
    state.searchFilter = {
      ...state.searchFilter,
      query: query
    };
    state.searchPage = 1;

    const activePage = await this.nav.getActive();
    if (activePage.component === 'page-search') {
      // If the active page is the search page, refresh it
      const el = activePage.element as HTMLPageSearchElement;
      el.activatedCallback();
    } else {
      // Otherwise, redirect to it
      redirect('/recipes');
    }
  }

  private async onPageChanging() {
    this.menu.close();

    // Refresh the user so that access controls are properly enforced
    if (this.isLoggedIn()) {
      try {
        state.currentUser = await UsersApi.get(this.el);
      } catch (ex) {
        console.error(ex);
      }
    }
  }

  private async onPageChanged() {
    // Let the new page know it's been activated
    const activePage = await this.nav.getActive();
    const el = activePage.element as any;
    if (typeof el.activatedCallback === 'function') {
      el.activatedCallback();
    }

    // Close any and all modals
    const controllers = [
      actionSheetController,
      alertController,
      modalController,
      pickerController,
      popoverController
    ];
    controllers.forEach(async controller => {
      for (let top = await controller.getTop(); top; top = await controller.getTop()) {
        await top.dismiss();
      }
    });
  }

  private async onSearchKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      await this.performSearch(this.searchBar.value);
    }
  }

  private async onSearchClear() {
    await this.performSearch('');
  }
}
