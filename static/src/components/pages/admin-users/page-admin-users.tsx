import { alertController, modalController } from '@ionic/core';
import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { AccessLevel, User } from '../../../api/schema.gen';
import { apiClient } from '../../../helpers/api';
import { ComponentWithActivatedCallback, enableBackForOverlay, enumKeyFromValue, isNull, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-admin-users',
  styleUrl: 'page-admin-users.css',
})
export class PageAdminUsers implements ComponentWithActivatedCallback {
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
                      <ion-card-subtitle>{enumKeyFromValue(AccessLevel, user.accessLevel)}</ion-card-subtitle>
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
      const { data: users, error } = await apiClient.GET('/users');

      if (error) {
        throw new Error('Failed to load users.', { cause: error });
      }

      this.users = users;
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveNewUser(user: User, password: string) {
    try {
      const { error } = await apiClient.POST('/users', {
        body: { ...user, password }
      });

      if (error) {
        throw new Error('Failed to create new user.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to create new user.');
    }
  }

  private async saveExistingUser(user: User) {
    try {
      if (isNull(user.id)) {
        throw new Error('Cannot save user: user ID is null.');
      }

      const { error } = await apiClient.PUT('/users/{userId}', {
        params: { path: { userId: user.id } },
        body: user
      });

      if (error) {
        throw new Error('Failed to save user.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save user.');
    }
  }

  private async deleteUser(user: User) {
    try {
      if (isNull(user.id)) {
        throw new Error('Cannot delete user: user ID is null.');
      }

      const { error } = await apiClient.DELETE('/users/{userId}', {
        params: { path: { userId: user.id } }
      });

      if (error) {
        throw new Error('Failed to delete user.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to delete user.');
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
          { text: 'No', role: 'cancel' },
          { text: 'Yes', role: 'confirm' }
        ],
      });

      await confirmation.present();

      const { role } = await confirmation.onDidDismiss();

      if (role === 'confirm') {
        await this.deleteUser(user);
        await this.loadUsers();
      }
    });
  }

}
