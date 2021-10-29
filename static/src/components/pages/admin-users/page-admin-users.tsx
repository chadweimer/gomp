import { alertController, modalController } from '@ionic/core';
import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { User } from '../../../generated';
import { usersApi } from '../../../helpers/api';
import { enableBackForOverlay, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-admin-users',
  styleUrl: 'page-admin-users.css',
})
export class PageAdminUsers {
  @State() users: User[] = [];

  @Element() el!: HTMLPageAdminUsersElement;

  @Method()
  async activatedCallback() {
    await this.loadUsers();
  }

  render() {
    return (
      <Host>
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
        </ion-content>

        <ion-fab horizontal="end" vertical="bottom" slot="fixed">
          <ion-fab-button color="success" onClick={() => this.onAddUserClicked()}>
            <ion-icon icon="person-add" />
          </ion-fab-button>
        </ion-fab>
      </Host>
    );
  }

  private async loadUsers() {
    try {
      this.users = (await usersApi.getAllUsers()).data ?? [];
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveNewUser(user: User, password: string) {
    try {
      await usersApi.addUser({ ...user, password });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create new user.');
    }
  }

  private async saveExistingUser(user: User) {
    try {
      await usersApi.saveUser(user.id.toString(), user);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save user.');
    }
  }

  private async deleteUser(user: User) {
    try {
      await usersApi.deleteUser(user.id.toString());
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete user.');
    }
  }

  private async onAddUserClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'user-editor',
        animated: false,
      });
      await modal.present();

      const resp = await modal.onDidDismiss<{ user: User, password: string }>();
      if (resp.data) {
        await this.saveNewUser(resp.data.user, resp.data.password);
        await this.loadUsers();
      }
    });
  }

  private async onEditUserClicked(user: User) {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'user-editor',
        componentProps: {
          user: user
        },
        animated: false,
      });
      await modal.present();

      const resp = await modal.onDidDismiss<{ user: User }>();
      if (resp.data) {
        await this.saveExistingUser({
          ...user,
          ...resp.data.user
        });
        await this.loadUsers();
      }
    });
  }

  private async onDeleteUserClicked(user: User) {
    await enableBackForOverlay(async () => {
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

      await confirmation.onDidDismiss();
    });
  }

}
