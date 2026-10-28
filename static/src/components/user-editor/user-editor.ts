import { LitElement, html, css, PropertyValues, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { AccessLevel, User } from '../../helpers/schema.gen';
import { configureModalCanDismiss, configureModalSelectsWorkaround, getContainingModal } from '../../helpers/modals';
import { insertSpacesBetweenWords, isNull } from '../../helpers/utils';
import { globalStyles } from '../../global/shared-styles';

@customElement('user-editor')
export class UserEditor extends LitElement {
  static readonly styles = [
    globalStyles,
    css`
      :host {
        display: block;
      }
    `
  ];

  @property({ type: Object }) user: User = {
    username: '',
    accessLevel: AccessLevel.Editor
  };

  @state() password = '';
  @state() repeatPassword = '';

  @query('form') private readonly form?: HTMLFormElement;
  @query('#username') private readonly usernameInput?: HTMLIonInputElement;
  @query('#password') private readonly passwordInput?: HTMLIonInputElement;
  @query('#repeat-password') private readonly repeatPasswordInput?: HTMLIonInputElement;

  private parentModal?: HTMLIonModalElement | null;

  override connectedCallback() {
    super.connectedCallback();
    const initialUser = { ...this.user };

    this.parentModal = getContainingModal(this);
    configureModalCanDismiss(this.parentModal, (_data?: unknown, role?: string) => {
      if (role === 'save') {
        return false;
      }

      // A blur event is not always guaranteed (e.g., if the user clicked the browser back button)
      if (this.usernameInput) {
        this.user = {
          ...this.user,
          username: (this.usernameInput.value as string) ?? this.user.username
        };
      }

      return (
        this.user.username !== initialUser.username ||
        this.user.accessLevel !== initialUser.accessLevel ||
        ((this.passwordInput?.value as string ?? '') !== '') ||
        ((this.repeatPasswordInput?.value as string ?? '') !== '')
      );
    });
  }

  override firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    configureModalSelectsWorkaround(this);
  }

  render() {
    const isNew = isNull(this.user?.id);

    return html`
      <ion-header>
        <ion-toolbar color="light">
          <ion-buttons slot="primary">
            <ion-button color="primary" @click=${() => this.onSaveClicked()}>Save</ion-button>
          </ion-buttons>
          <ion-title>${isNew ? 'New User' : 'Edit User'}</ion-title>
          <ion-buttons slot="secondary">
            <ion-button color="danger" @click=${() => this.onCancelClicked()}>Cancel</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <form @submit=${(e: Event) => e.preventDefault()}>
          <ion-item lines="full">
            <ion-input
              label="Email"
              label-placement="stacked"
              id="username"
              type="email"
              .value=${this.user?.username ?? ''}
              ?disabled=${!isNew}
              @ionChange=${(e: CustomEvent) => this.user = { ...this.user, username: (e.detail.value as string) ?? '' }}
              required
              autofocus
            ></ion-input>
          </ion-item>
          <ion-item lines="full">
            <ion-select
              label="Access Level"
              label-placement="stacked"
              interface="popover"
              .value=${this.user?.accessLevel ?? AccessLevel.Editor}
              @ionChange=${(e: CustomEvent<{ value: AccessLevel }>) => this.user = { ...this.user, accessLevel: e.detail.value }}
            >
              ${Object.keys(AccessLevel).map(item => html`
                <ion-select-option .value=${AccessLevel[item as keyof typeof AccessLevel]}>
                  ${insertSpacesBetweenWords(item)}
                </ion-select-option>
              `)}
            </ion-select>
          </ion-item>
          ${isNew ? html`
            <ion-item lines="full">
              <ion-input
                label="Password"
                label-placement="stacked"
                id="password"
                type="password"
                autocomplete="new-password"
                .value=${this.password}
                @ionChange=${(e: CustomEvent) => this.password = (e.detail.value as string) ?? ''}
                required
              ></ion-input>
            </ion-item>
            <ion-item lines="full">
              <ion-input
                label="Confirm Password"
                label-placement="stacked"
                id="repeat-password"
                type="password"
                autocomplete="new-password"
                .value=${this.repeatPassword}
                @ionChange=${(e: CustomEvent) => this.repeatPassword = (e.detail.value as string) ?? ''}
                required
              ></ion-input>
            </ion-item>
          ` : nothing}
        </form>
      </ion-content>
    `;
  }

  private async onSaveClicked() {
    if (isNull(this.user.id)) {
      const native = await this.repeatPasswordInput?.getInputElement();
      native?.setCustomValidity(this.password === this.repeatPassword ? '' : 'Passwords must match');

      if (this.form && !this.form.reportValidity()) {
        return;
      }

      await this.parentModal?.dismiss({
        user: this.user,
        password: this.password
      }, 'save');
    } else {
      await this.parentModal?.dismiss({ user: this.user }, 'save');
    }
  }

  private async onCancelClicked() {
    await this.parentModal?.dismiss(undefined, 'cancel');
  }
}
