import { modalController } from '@ionic/core';
import { Component, Element, h, State } from '@stencil/core';
import { AppConfiguration, User } from '../../models';
import { ajaxGetWithResult, ajaxPut } from '../../helpers/ajax';
import state from '../../store';

@Component({
  tag: 'page-admin',
  styleUrl: 'page-admin.css'
})
export class PageAdmin {
  @State() appTitle = "GOMP: Go Meal Planner";
  @State() users: User[] = [];

  @Element() el: HTMLElement;

  async connectedCallback() {
    await this.loadAppConfiguration();
    await this.loadUsers();
  }

  render() {
    return (
      <ion-tabs>
        <ion-tab tab="tab-admin-configuration">
          <ion-content>
            <ion-grid>
              <ion-row class="ion-justify-content-center">
                <ion-col size-xs="12" size-sm="12" size-md="10" size-lg="8" size-xl="6">
                  <ion-card class="container-wide">
                    <ion-card-content>
                      <ion-item>
                        <ion-label position="floating">Application Title</ion-label>
                        <ion-input value={this.appTitle} onIonChange={e => this.appTitle = e.detail.value} />
                      </ion-item>
                    </ion-card-content>
                    <ion-footer>
                      <ion-toolbar>
                        <ion-buttons slot="primary">
                          <ion-button color="primary" onClick={() => this.onSaveConfigurationClicked()}>Save</ion-button>
                        </ion-buttons>
                        <ion-buttons slot="secondary">
                          <ion-button color="danger" onClick={() => this.loadAppConfiguration()}>Reset</ion-button>
                        </ion-buttons>
                      </ion-toolbar>
                    </ion-footer>
                  </ion-card>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-content>
        </ion-tab>

        <ion-tab tab="tab-admin-users">
          <ion-content>
            <ion-grid>
              <ion-row>
                {this.users.map(user =>
                  <ion-col size-xs="12" size-sm="12" size-md="6" size-lg="4" size-xl="4">
                    <ion-card>
                      <ion-card-content>
                        <ion-item lines="none">
                          <ion-label>
                            <h2>{user.username}</h2>
                            <p>{user.accessLevel}</p>
                          </ion-label>
                          <ion-buttons><ion-button slot="end" fill="clear" color="warning"><ion-icon name="create" /></ion-button>
                            <ion-button slot="end" fill="clear" color="danger"><ion-icon name="trash" /></ion-button></ion-buttons>
                        </ion-item>
                      </ion-card-content>
                    </ion-card>
                  </ion-col>
                )}
              </ion-row>
            </ion-grid>
            <ion-fab horizontal="end" vertical="bottom" slot="fixed">
              <ion-fab-button color="success" onClick={() => this.onAddUserClicked()}>
                <ion-icon icon="person-add" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-tab>

        <ion-tab-bar slot="top">
          <ion-tab-button tab="tab-admin-configuration" href="/admin/configuration">
            <ion-icon name="construct" />
            <ion-label>Configuration</ion-label>
          </ion-tab-button>
          <ion-tab-button tab="tab-admin-users" href="/admin/users">
            <ion-icon name="people" />
            <ion-label>Users</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    );
  }

  async loadAppConfiguration() {
    try {
      const appConfig = await ajaxGetWithResult<AppConfiguration>(this.el, '/api/v1/app/configuration');
      this.appTitle = appConfig.title;
    } catch (ex) {
      console.error(ex);
    }
  }

  async onSaveConfigurationClicked() {
    try {
      const appConfig: AppConfiguration = {
        title: this.appTitle
      };
      await ajaxPut(this.el, '/api/v1/app/configuration', appConfig);
      state.appConfig = appConfig;
    } catch (ex) {
      console.error(ex);
    }
  }

  async loadUsers() {
    try {
      this.users = await ajaxGetWithResult(this.el, '/api/v1/users');
    } catch (ex) {
      console.error(ex);
    }
  }

  async onAddUserClicked() {
    const modal = await modalController.create({
      component: 'user-editor',
    });
    await modal.present();
  }
}
