import { Component, h } from '@stencil/core';

@Component({
  tag: 'app-root',
  styleUrl: 'app-root.css',
})
export class AppRoot {
  render() {
    return (
      <ion-app>
        <ion-router useHash={false}>
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
          </ion-route>

          <ion-route url="/admin" component="tab-admin">
          </ion-route>
        </ion-router>

        <ion-menu side="start" content-id="main-content">
          <ion-header>
            <ion-toolbar>
              <ion-title>Wine &amp; Cats</ion-title>
            </ion-toolbar>
          </ion-header>
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
              <ion-item href="/admin" lines="none">
                <ion-icon name="log-out" slot="start"></ion-icon>
                <ion-label>Logout</ion-label>
              </ion-item>
            </ion-list>
          </ion-content>
        </ion-menu>

        <div class="ion-page" id="main-content">
          <ion-header>
            <ion-toolbar color="primary">
              <ion-buttons slot="start">
                <ion-menu-button class="hide-on-large-only"></ion-menu-button>
              </ion-buttons>

              <ion-title class="hide-on-small-only">Wine &amp; Cats</ion-title>

              <ion-buttons slot="end">
                <ion-button href="/" class="hide-on-med-and-down">Home</ion-button>
                <ion-button href="/recipes" class="hide-on-med-and-down">Recipes <ion-badge>99</ion-badge></ion-button>
                <ion-button href="/settings" class="hide-on-med-and-down">Settings</ion-button>
                <ion-button href="/admin" class="hide-on-med-and-down">Admin</ion-button>
                <ion-button class="hide-on-med-and-down">Logout</ion-button>
                <ion-searchbar show-clear-button="always"></ion-searchbar>
              </ion-buttons>
            </ion-toolbar>
            <ion-progress-bar type="indeterminate" color="secondary"></ion-progress-bar>
          </ion-header>

          <ion-content class="ion-padding">
            <ion-tabs>
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
}
