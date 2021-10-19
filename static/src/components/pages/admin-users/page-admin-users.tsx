import { alertController, modalController } from '@ionic/core';
import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { UsersApi } from '../../../helpers/api';
import { enableBackForOverlay, showToast } from '../../../helpers/utils';
import { User } from '../../../models';

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
      this.users = await UsersApi.getAll(this.el);
    } catch (ex) {
      console.error(ex);
    }
  }

  private async saveNewUser(user: User, password: string) {
    try {
      await UsersApi.post(this.el, user, password);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to create new user.');
    }
  }

  private async saveExistingUser(user: User) {
    try {
      await UsersApi.put(this.el, user);
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save user.');
    }
  }

  private async deleteUser(user: User) {
    try {
      await UsersApi.delete(this.el, user.id);
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

      const resp = await modal.onDidDismiss<{ dismissed: boolean, user: User, password: string }>();
      if (resp.data?.dismissed === false) {
        await this.saveNewUser(resp.data.user, resp.data.password);
        await this.loadUsers();
      }
    });
  }

  private async onEditUserClicked(user: User | null) {
    await enableBackForOverlay(async () => {
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
