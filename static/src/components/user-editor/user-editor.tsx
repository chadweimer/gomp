import { Component, Element, h, Prop, State } from '@stencil/core';
import { AccessLevel, NewUser, User } from '../../models';

@Component({
  tag: 'user-editor',
  styleUrl: 'user-editor.css'
})
export class UserEditor {
  @Prop() user: User | null = null;

  @State() username = '';
  @State() accessLevel: string = AccessLevel.Editor;
  @State() password = '';
  @State() repeatPassword = '';

  @Element() el: HTMLElement;
  form: HTMLFormElement;
  repeatPasswordInput: HTMLIonInputElement;

  availableAccessLevels = [
      {name: 'Administrator', value: AccessLevel.Administrator},
      {name: 'Editor', value: AccessLevel.Editor},
      {name: 'Viewer', value: AccessLevel.Viewer}
  ];

  connectedCallback() {
    if (this.user !== null) {
      this.username = this.user.username;
      this.accessLevel = this.user.accessLevel;
    }
  }

  render() {
    return (
      <form onSubmit={e => e.preventDefault()} ref={el => this.form = el}>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="primary">
              <ion-button type="submit" onClick={() => this.onSaveClicked()}>Save</ion-button>
            </ion-buttons>
            <ion-title>{this.user === null ? 'New User' : 'Edit User'}</ion-title>
            <ion-buttons slot="secondary">
              <ion-button color="danger" onClick={() => this.onCancelClicked()}>Cancel</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-item>
            <ion-label position="stacked">Email</ion-label>
            <ion-input type="email" value={this.username} disabled={this.user !== null} onIonChange={e => this.username = e.detail.value} required />
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Access Level</ion-label>
            <ion-select value={this.accessLevel} interface="popover" onIonChange={e => this.accessLevel = e.detail.value}>
              {this.availableAccessLevels.map(level =>
                <ion-select-option value={level.value}>{level.name}</ion-select-option>
              )}
            </ion-select>
          </ion-item>
          {this.renderPasswords()}
        </ion-content>
      </form>
    );
  }

  renderPasswords() {
    if (this.user === null) {
      return [
        <ion-item>
          <ion-label position="stacked">Password</ion-label>
          <ion-input type="password" onIonChange={e => this.password = e.detail.value} required />
        </ion-item>,
        <ion-item>
          <ion-label position="stacked">Confirm Password</ion-label>
          <ion-input type="password" onIonChange={e => this.repeatPassword = e.detail.value} ref={el => this.repeatPasswordInput = el} required />
        </ion-item>,
      ];
    }
  }

  async onSaveClicked() {
    if (this.user === null) {
      const native = await this.repeatPasswordInput.getInputElement();
      if (this.password !== this.repeatPassword) {
        native.setCustomValidity('Passwords must match');
      } else {
        native.setCustomValidity('');
      }

      if (!this.form.reportValidity()) {
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
