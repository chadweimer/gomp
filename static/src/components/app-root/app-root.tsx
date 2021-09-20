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

  async componentWillLoad() {
    await this.loadAppConfiguration();
  }

  render() {
    return (
      <ion-app>
        <ion-router useHash={false} ref={el => this.router = el}>
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
            <ion-route component="page-settings" />
          </ion-route>

          <ion-route url="/admin" component="tab-admin">
            <ion-route component="page-admin" />
          </ion-route>
        </ion-router>

        <ion-menu side="start" content-id="main-content">
          <ion-content>
            <ion-list>
              <ion-item href="/" lines="none">
                <ion-icon name="home" slot="start"></ion-icon>
                <ion-label>Home</ion-label>
              </ion-item>
              <ion-item href="/recipes" lines="full">
                <ion-icon name="restaurant" slot="start"></ion-icon>
                <ion-label>Recipes</ion-label>
              </ion-item>
              <ion-item href="/settings" lines="none">
                <ion-icon name="settings" slot="start"></ion-icon>
                <ion-label>Settings</ion-label>
              </ion-item>
              <ion-item href="/admin" lines="full">
                <ion-icon name="lock-closed" slot="start"></ion-icon>
                <ion-label>Admin</ion-label>
              </ion-item>
              <ion-item href="/login" lines="none">
                <ion-icon name="log-out" slot="start"></ion-icon>
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
                <ion-menu-button class="ion-hide-lg-up"></ion-menu-button>
              </ion-buttons>

              <ion-title class="ion-hide-sm-down">{this.appConfig?.title}</ion-title>

              <ion-buttons slot="end">
                <ion-button href="/" class="ion-hide-lg-down">Home</ion-button>
                <ion-button href="/recipes" class="ion-hide-lg-down">Recipes <ion-badge>99</ion-badge></ion-button>
                <ion-button href="/settings" class="ion-hide-lg-down">Settings</ion-button>
                <ion-button href="/admin" class="ion-hide-lg-down">Admin</ion-button>
                <ion-button href="/login" class="ion-hide-lg-down">Logout</ion-button>
                <ion-searchbar show-clear-button="always"></ion-searchbar>
              </ion-buttons>
            </ion-toolbar>
            <ion-progress-bar type="indeterminate" color="secondary" hidden={this.loadingCount === 0}></ion-progress-bar>
          </ion-header>

          <ion-content>
            <ion-tabs class="ion-padding">

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

  logout() {
    localStorage.clear();
    sessionStorage.clear();
    this.router.push('/login');
  }
}
