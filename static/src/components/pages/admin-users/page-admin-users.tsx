import { alertController, modalController } from '@ionic/core';
import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { User } from '../../../generated';
import { usersApi } from '../../../helpers/api';
import { enableBackForOverlay, isNull, showToast } from '../../../helpers/utils';

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
              {this.users?.map(user =>
                <ion-col key={user.id} size="12" size-md="6" size-lg="4" size-xl="3">
                  <ion-card class="zoom">
                    <ion-card-header>
                      <ion-card-title>{user.username}</ion-card-title>
                      <ion-card-subtitle>{user.accessLevel}</ion-card-subtitle>
                    </ion-card-header>
                    <ion-button size="small" fill="clear" onClick={() => this.onEditUserClicked(user)}>
                      <ion-icon slot="start" name="create" />
                      Edit
                    </ion-button>
                    <ion-button size="small" fill="clear" color="danger" onClick={() => this.onDeleteUserClicked(user)}>
                      <ion-icon slot="start" name="trash" />
                      Delete
                    </ion-button>
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
      this.users = await usersApi.getAllUsers();
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveNewUser(user: User, password: string) {
    try {
      await usersApi.addUser({ user: { ...user, password } });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create new user.');
    }
  }

  private async saveExistingUser(user: User) {
    try {
      await usersApi.saveUser({
        userId: user.id,
        user: user
      });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save user.');
    }
  }

  private async deleteUser(user: User) {
    try {
      await usersApi.deleteUser({ userId: user.id });
    } catch (ex) {
      console.error(ex);
      showToast('Failed to delete user.');
    }
  }

  private async onAddUserClicked() {
    await enableBackForOverlay(async () => {
      const modal = await modalController.create({
        component: 'user-editor',
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ user: User, password: string }>();
      if (!isNull(data)) {
        await this.saveNewUser(data.user, data.password);
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
        backdropDismiss: false,
      });
      await modal.present();

      const { data } = await modal.onDidDismiss<{ user: User }>();
      if (!isNull(data)) {
        await this.saveExistingUser({
          ...user,
          ...data.user
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
      });

      await confirmation.present();

      await confirmation.onDidDismiss();
    });
  }

}
