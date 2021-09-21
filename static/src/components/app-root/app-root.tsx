import { Component, Element, h, Listen, State } from '@stencil/core';
import { AppConfiguration, AppInfo } from '../../global/models';
import { ajaxGetWithResult } from '../../helpers/ajax';

@Component({
  tag: 'app-root',
  styleUrl: 'app-root.css',
})
export class AppRoot {
  @State() appInfo: AppInfo | null;
  @State() appConfig: AppConfiguration | null;
  @State() loadingCount = 0;

  @Element() el: HTMLElement;
  router!: HTMLIonRouterElement;
  menu!: HTMLIonMenuElement;

  async componentWillLoad() {
    await this.loadAppConfiguration();
  }

  render() {
    return (
      <ion-app>
        <ion-router useHash={false} ref={el => this.router = el} onIonRouteWillChange={() => this.onPageChanging()}>
          <ion-route url="/login" component="tab-login">
            <ion-route component="page-login" />
          </ion-route>

          <ion-route url="/" component="tab-home">
            <ion-route component="page-home" />
          </ion-route>

          <ion-route url="/recipes" component="tab-recipes">
            <ion-route component="page-search" />
            <ion-route url="/new" component="page-create-recipe" />
            <ion-route url="/:id/view" component="page-view-recipe" />
            <ion-route url="/:id/edit" component="page-edit-recipe" />
          </ion-route>

          <ion-route url="/settings" component="tab-settings">
            <ion-route component="page-settings">
              <ion-route component="tab-settings-preferences" />
              <ion-route url="/preferences" component="tab-settings-preferences" />
              <ion-route url="/searches" component="tab-settings-searches" />
              <ion-route url="/security" component="tab-settings-security" />
            </ion-route>
          </ion-route>

          <ion-route url="/admin" component="tab-admin">
            <ion-route component="page-admin">
              <ion-route component="tab-admin-configuration" />
              <ion-route url="/configuration" component="tab-admin-configuration" />
              <ion-route url="/users" component="tab-admin-users" />
            </ion-route>
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
              <ion-item href="/admin" lines="full">
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
            <div class="copyright">GOMP: Go Meal Plannner {this.appInfo?.version ?? 'vUNKNOWN'}. Copyright © 2016-2021 Chad Weimer</div>
          </ion-footer>
        </ion-menu>

        <div class="ion-page" id="main-content">
          <ion-header>
            <ion-toolbar color="primary">
              <ion-buttons slot="start">
                <ion-menu-button class="ion-hide-lg-up" />
              </ion-buttons>

              <ion-title class="ion-hide-sm-down">{this.appConfig?.title}</ion-title>

              <ion-buttons slot="end">
                <ion-button href="/" class="ion-hide-lg-down">Home</ion-button>
                <ion-button href="/recipes" class="ion-hide-lg-down">Recipes <ion-badge>99</ion-badge></ion-button>
                <ion-button href="/settings" class="ion-hide-lg-down">Settings</ion-button>
                <ion-button href="/admin" class="ion-hide-lg-down">Admin</ion-button>
                <ion-button class="ion-hide-lg-down" onClick={() => this.logout()}>Logout</ion-button>
                <ion-searchbar show-clear-button="always" />
              </ion-buttons>
            </ion-toolbar>
            <ion-progress-bar type="indeterminate" color="secondary" hidden={this.loadingCount === 0} />
          </ion-header>

          <ion-content>
            <ion-tabs>

              <ion-tab tab="tab-login">
                <ion-nav />
              </ion-tab>

              <ion-tab tab="tab-home">
                <ion-nav />
              </ion-tab>

              <ion-tab tab="tab-recipes">
                <ion-nav />
              </ion-tab>

              <ion-tab tab="tab-settings">
                <ion-nav />
              </ion-tab>

              <ion-tab tab="tab-admin">
                <ion-nav />
              </ion-tab>

            </ion-tabs>
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

  async loadAppConfiguration() {
    try {
      this.appInfo = await ajaxGetWithResult(this.el, '/api/v1/app/info');
      this.appConfig = await ajaxGetWithResult(this.el, '/api/v1/app/configuration');

      document.title = this.appConfig.title;
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

  onPageChanging() {
    this.menu.close();
  }

  logout() {
    localStorage.clear();
    sessionStorage.clear();
    this.router.push('/login');
  }
}
