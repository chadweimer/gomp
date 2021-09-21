import { modalController } from '@ionic/core';
import { Component, Element, h, State } from '@stencil/core';
import { AppConfiguration, User } from '../../global/models';
import { ajaxGetWithResult } from '../../helpers/ajax';

@Component({
  tag: 'page-admin',
  styleUrl: 'page-admin.css'
})
export class PageAdmin {
  @State() appConfig: AppConfiguration = {
    title: "GOMP: Go Meal Planner"
  };
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
          <ion-content class="ion-padding">
            <ion-card class="container-wide">
              <ion-card-content>
                <ion-item>
                  <ion-label color="primary">Application Title</ion-label>
                  <ion-input value={this.appConfig.title} onIonChange={e => this.appConfig.title = e.detail.value} />
                </ion-item>
              </ion-card-content>
              <ion-footer>
                <ion-toolbar>
                  <ion-buttons slot="primary">
                    <ion-button color="primary">Save</ion-button>
                  </ion-buttons>
                  <ion-buttons slot="secondary">
                    <ion-button color="danger">Reset</ion-button>
                  </ion-buttons>
                </ion-toolbar>
              </ion-footer>
            </ion-card>
          </ion-content>
        </ion-tab>

        <ion-tab tab="tab-admin-users">
          <ion-content class="ion-padding">
            <ion-card class="container-wide">
              <ion-card-content>
                <table class="fill">
                  <thead class="ion-text-left">
                    <tr>
                      <th>Email</th>
                      <th>Access Level</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {this.users.map(user =>
                      <tr>
                        <td>{user.username}</td>
                        <td>{user.accessLevel}</td>
                        <td class="ion-text-right">
                          <ion-icon name="create" size="large" color="warning" />
                          <ion-icon name="trash" size="large" color="danger" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </ion-card-content>
            </ion-card>
            <ion-fab horizontal="end" vertical="bottom" slot="fixed">
              <ion-fab-button color="success" onClick={() => this.onAddUserClicked()}>
                <ion-icon icon="person-add" />
              </ion-fab-button>
            </ion-fab>
          </ion-content>
        </ion-tab>

        <ion-tab-bar slot="top">
          <ion-tab-button tab="tab-admin-configuration" href="/admin/configuration">
            <ion-icon name="build" />
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
      this.appConfig = await ajaxGetWithResult(this.el, '/api/v1/app/configuration');
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
      component: 'recipe-editor',
    });
    await modal.present();
  }
}
