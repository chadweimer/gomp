import { Component, Element, h, Prop, State } from '@stencil/core';
import { AccessLevel, NewUser, User } from '../../models';

@Component({
  tag: 'user-editor',
  styleUrl: 'user-editor.css'
})
export class UserEditor {
  @Prop() user: User | null = null;

  @State() userId: number | null = null;
  @State() username = '';
  @State() accessLevel: string = AccessLevel.Editor;
  @State() password = '';
  @State() repeatPassword = '';

  @Element() el: HTMLElement;

  availableAccessLevels = [
      {name: 'Administrator', value: AccessLevel.Administrator},
      {name: 'Editor', value: AccessLevel.Editor},
      {name: 'Viewer', value: AccessLevel.Viewer}
  ];

  connectedCallback() {
    if (this.user !== null) {
      this.userId = this.user.id;
      this.username = this.user.username;
      this.accessLevel = this.user.accessLevel;
    }
  }

  render() {
    return [
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="primary">
            <ion-button onClick={() => this.onSaveClicked()}>Save</ion-button>
          </ion-buttons>
          <ion-title>New User</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>,

      <ion-content>
        <ion-item>
          <ion-label position="floating">Email</ion-label>
          <ion-input value={this.username} disabled={this.user !== null} onIonChange={e => this.username = e.detail.value} />
        </ion-item>
        <ion-item>
          <ion-label position="floating">Access Level</ion-label>
          <ion-select value={this.accessLevel} interface="popover" onIonChange={e => this.accessLevel = e.detail.value}>
            {this.availableAccessLevels.map(level =>
              <ion-select-option value={level.value}>{level.name}</ion-select-option>
            )}
          </ion-select>
        </ion-item>
        {this.renderPasswords()}
      </ion-content>
    ];
  }

  renderPasswords() {
    if (this.user === null) {
      return [
        <ion-item>
          <ion-label position="floating">Password</ion-label>
          <ion-input type="password" onIonChange={e => this.password = e.detail.value} />
        </ion-item>,
        <ion-item>
          <ion-label position="floating">Confirm Password</ion-label>
          <ion-input type="password" onIonChange={e => this.repeatPassword = e.detail.value} />
        </ion-item>
      ];
    }
  }

  async onSaveClicked() {
    if (this.user === null) {
      if (this.username.trim() === '' || this.password.trim() === '')
      {
        // TODO: Error messages
        return;
      }
      if (this.password !== this.repeatPassword) {
        // TODO: Error messages
        return;
      }

      this.el.closest('ion-modal').dismiss({
        dismissed: false,
        user: {
          username: this.username,
          accessLevel: this.accessLevel,
          password: this.password
        } as NewUser
      });
    } else {
      this.el.closest('ion-modal').dismiss({
        dismissed: false,
        user: {
          username: this.username,
          accessLevel: this.accessLevel,
        } as User
      });
    }
  }

  onCancelClicked() {
    this.el.closest('ion-modal').dismiss({
      dismissed: true
    });
  }
}
