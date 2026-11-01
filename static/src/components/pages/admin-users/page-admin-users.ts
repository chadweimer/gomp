import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AccessLevel, User } from '../../../helpers/schema.gen';
import { api } from '../../../helpers/api';
import { showAlert, showModal, showToast } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, enumKeyFromValue, isNull } from '../../../helpers/utils';
import '../../page-navigator/page-navigator';
import '../../user-editor/user-editor';
import '../../app-icon/app-icon';
import './page-admin-users.css';

@customElement('page-admin-users')
export class PageAdminUsers extends LitElement implements ComponentWithActivatedCallback {
  private readonly resultsPerPage = 24;

  @state() users: User[] = [];
  @state() page = 1;
  @state() numPages = 1;

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.activatedCallback().catch(console.error);
  }

  async activatedCallback() {
    await this.loadUsers();
  }

  render() {
    return html`
      <ion-content>
        <ion-grid class="no-pad">
          <ion-row>
            ${this.users.map(user => html`
              <ion-col key=${user.id} size="12" size-md="6" size-lg="4" size-xl="3">
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>${user.username}</ion-card-title>
                    <ion-card-subtitle>${enumKeyFromValue(AccessLevel, user.accessLevel)}</ion-card-subtitle>
                  </ion-card-header>
                  <ion-button size="small" fill="clear" @click=${() => this.onEditUserClicked(user)}>
                    <app-icon slot="start" name="edit_square" size="small"></app-icon>
                    Edit
                  </ion-button>
                  <ion-button size="small" fill="clear" color="danger" @click=${() => this.onDeleteUserClicked(user)}>
                    <app-icon slot="start" name="delete" size="small"></app-icon>
                    Delete
                  </ion-button>
                </ion-card>
              </ion-col>
            `)}
          </ion-row>
        </ion-grid>

        <ion-fab horizontal="end" vertical="bottom" slot="fixed">
          <ion-fab-button color="secondary" @click=${() => this.onAddUserClicked()}>
            <app-icon name="person_add"></app-icon>
          </ion-fab-button>
        </ion-fab>
      </ion-content>

      <ion-footer>
        <ion-toolbar color="light">
          <page-navigator
            class="ion-justify-content-center"
            color="secondary"
            .page=${this.page}
            .numPages=${this.numPages}
            @pageChanged=${(e: CustomEvent<number>) => this.setPage(e.detail)}
          ></page-navigator>
        </ion-toolbar>
      </ion-footer>
    `;
  }

  private async loadUsers() {
    try {
      const { data, error } = await api.client.GET('/users', {
        params: { query: { page: this.page, count: this.resultsPerPage } }
      });

      if (error) {
        throw new Error('Failed to load users.', { cause: error });
      }

      this.users = data?.users ?? [];
      this.numPages = Math.max(Math.ceil((data?.total ?? 0) / this.resultsPerPage), 1);
    } catch (ex) {
      this.users = [];
      this.numPages = 1;
      console.error(ex);
    }
  }

  private setPage(page: number) {
    this.page = page;
    this.loadUsers().catch(console.error);
  }

  private async saveNewUser(user: User, password: string) {
    try {
      const { error } = await api.client.POST('/users', {
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

      const { error } = await api.client.PUT('/users/{userId}', {
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

      const { error } = await api.client.DELETE('/users/{userId}', {
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
    const { data } = await showModal<{ user: User, password: string }>({
      presentingElement: this,
      component: 'user-editor',
    });
    if (!isNull(data)) {
      await this.saveNewUser(data.user, data.password);
      await this.loadUsers();
    }
  }

  private async onEditUserClicked(user: User) {
    const { data } = await showModal<{ user: User }>({
      presentingElement: this,
      component: 'user-editor',
      componentProps: {
        user: user
      },
    });
    if (!isNull(data)) {
      await this.saveExistingUser({
        ...user,
        ...data.user
      });
      await this.loadUsers();
    }
  }

  private async onDeleteUserClicked(user: User) {
    const { role } = await showAlert({
      header: 'Delete User?',
      message: `Are you sure you want to delete ${user.username}?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive' }
      ],
    });

    if (role === 'destructive') {
      await this.deleteUser(user);
      await this.loadUsers();
    }
  }
}
