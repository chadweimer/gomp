import { alertController, modalController } from '@ionic/core';
import { Component, Element, h, Method, State } from '@stencil/core';
import { AppApi, UsersApi } from '../../../helpers/api';
import { AppConfiguration, User } from '../../../models';
import state from '../../../store';

@Component({
  tag: 'page-admin',
  styleUrl: 'page-admin.css'
})
export class PageAdmin {
  @State() appTitle = 'GOMP: Go Meal Planner';
  @State() users: User[] = [];

  @Element() el!: HTMLPageAdminElement;
  private appConfigForm!: HTMLFormElement;

  @Method()
  async activatedCallback() {
    await this.loadAppConfiguration();
    await this.loadUsers();
  }

  render() {
    return (
      <ion-tabs>
        <ion-tab tab="tab-admin-configuration">
          <ion-content>
            <ion-grid class="no-pad" fixed>
              <ion-row>
                <ion-col>
                  <form onSubmit={e => e.preventDefault()} ref={el => this.appConfigForm = el}>
                    <ion-card>
                      <ion-card-content>
                        <ion-item>
                          <ion-label position="stacked">Application Title</ion-label>
                          <ion-input value={this.appTitle} onIonChange={e => this.appTitle = e.detail.value} required />
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
                  </form>
                </ion-col>
              </ion-row>
            </ion-grid>
          </ion-content>
        </ion-tab>

        <ion-tab tab="tab-admin-users">
          <ion-content>
            <ion-grid class="no-pad">
              <ion-row>
                {this.users.map(user =>
                  <ion-col size="12" size-md="6" size-lg="4" size-xl="3">
                    <ion-card>
                      <ion-card-content>
                        <ion-item lines="none">
                          <ion-label>
                            <h2>{user.username}</h2>
                            <p>{user.accessLevel}</p>
                          </ion-label>
                          <ion-buttons>
                            <ion-button slot="end" fill="clear" color="warning" onClick={() => this.onEditUserClicked(user)}><ion-icon name="create" /></ion-button>
                            <ion-button slot="end" fill="clear" color="danger" onClick={() => this.onDeleteUserClicked(user)}><ion-icon name="trash" /></ion-button>
                          </ion-buttons>
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

  private async loadAppConfiguration() {
    try {
      const appConfig = await AppApi.getConfiguration(this.el);
      this.appTitle = appConfig.title;
    } catch (ex) {
      console.error(ex);
    }
  }

  private async onSaveConfigurationClicked() {
    if (!this.appConfigForm.reportValidity()) {
      return;
    }

    try {
      const appConfig: AppConfiguration = {
        title: this.appTitle
      };
      await AppApi.putConfiguration(this.el, appConfig);
      state.appConfig = appConfig;
    } catch (ex) {
      console.error(ex);
    }
  }

  private async loadUsers() {
    try {
      this.users = await UsersApi.getAll(this.el);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveNewUser(user: User, password: string) {
    try {
      await UsersApi.post(this.el, user, password);
    } catch (ex) {
      console.log(ex);
    }
  }

  private async saveExistingUser(user: User) {
    try {
      await UsersApi.put(this.el, user);
    } catch (ex) {
      console.log(ex);
    }
  }

  private async deleteUser(user: User) {
    try {
      await UsersApi.delete(this.el, user.id);
    } catch (ex) {
      console.log(ex);
    }
  }

  private async onAddUserClicked() {
    window.history.pushState({ modal: true }, '');

    const modal = await modalController.create({
      component: 'user-editor',
      animated: false,
    });
    await modal.present();

    const resp = await modal.onDidDismiss<{ dismissed: boolean, user: User, password: string }>();
    if (resp.data?.dismissed === false) {
      await this.saveNewUser(resp.data.user, resp.data.password);
      await this.loadUsers();
    }
  }

  private async onEditUserClicked(user: User | null) {
    window.history.pushState({ modal: true }, '');

    const modal = await modalController.create({
      component: 'user-editor',
      animated: false,
    });
    await modal.present();

    // Workaround for auto-grow textboxes in a dialog.
    // Set this only after the dialog has presented,
    // instead of using component props
    modal.querySelector('user-editor').user = user;

    const resp = await modal.onDidDismiss<{ dismissed: boolean, user: User }>();
    if (resp.data?.dismissed === false) {
      await this.saveExistingUser({
        ...user,
        ...resp.data.user
      });
      await this.loadUsers();
    }
  }

  private async onDeleteUserClicked(user: User) {
    window.history.pushState({ modal: true }, '');

    const confirmation = await alertController.create({
      header: 'Delete User?',
      message: `Are you sure you want to delete ${user.username}?`,
      buttons: [
        'No',
        {
          text: 'Yes',
          handler: async () => {
            await this.deleteUser(user);
            await this.loadUsers();
            return true;
          }
        }
      ],
      animated: false,
    });

    await confirmation.present();
  }
}
