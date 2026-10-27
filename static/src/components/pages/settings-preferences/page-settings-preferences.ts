import { LitElement, html } from 'lit';
import { customElement, state as litState, query } from 'lit/decorators.js';
import { UserSettings } from '../../../helpers/schema.gen';
import { api, fileContentSerializer } from '../../../helpers/api';
import { showLoading, showToast } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, isNull, isNullOrEmpty, trap } from '../../../helpers/utils';
import '../../tags-input/tags-input';
import './page-settings-preferences.css';

@customElement('page-settings-preferences')
export class PageSettingsPreferences extends LitElement implements ComponentWithActivatedCallback {
  @litState() settings: UserSettings | null = null;

  @query('form') private form?: HTMLFormElement;
  @query('#image-input') private imageInput?: HTMLInputElement;

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.activatedCallback().catch(console.error);
  }

  async activatedCallback() {
    this.settings = await trap(api.loadUserSettings, null);
  }

  render() {
    return html`
      <ion-content>
        <ion-grid class="no-pad" fixed>
          <ion-row>
            <ion-col>
              <form @submit=${(e: Event) => e.preventDefault()}>
                <ion-card>
                  <ion-card-content>
                    <ion-item lines="full">
                      <ion-input
                        label="Home Title"
                        label-placement="stacked"
                        .value=${this.settings?.homeTitle ?? ''}
                        autocorrect="on"
                        spellcheck
                        required
                        @ionBlur=${(e: Event) => {
        const val = (e.currentTarget as HTMLIonInputElement).value as string;
        this.settings = {
          ...this.settings,
          homeTitle: val,
          favoriteTags: this.settings?.favoriteTags ?? []
        };
      }}
                      ></ion-input>
                    </ion-item>
                    <ion-item lines="full">
                      <form enctype="multipart/form-data">
                        <ion-label position="stacked">Home Image</ion-label>
                        <input id="image-input" name="file_content" type="file" accept=".jpg,.jpeg,.png" class="ion-padding-vertical" />
                      </form>
                      <ion-thumbnail>
                        <img alt="Home" src=${this.settings?.homeImageUrl ?? ''} ?hidden=${isNullOrEmpty(this.settings?.homeImageUrl)} />
                      </ion-thumbnail>
                    </ion-item>
                    <ion-item lines="full">
                      <tags-input
                        label="Favorite Tags"
                        label-placement="stacked"
                        .value=${this.settings?.favoriteTags ?? []}
                        @valueChanged=${(e: CustomEvent<string[]>) => {
        this.settings = {
          ...this.settings,
          favoriteTags: e.detail
        };
      }}
                      >
                        <ion-input enterkeyhint="enter"></ion-input>
                      </tags-input>
                    </ion-item>
                  </ion-card-content>
                  <ion-button fill="clear" color="primary" @click=${() => this.onSaveSettingsClicked()}>
                    <ion-icon slot="start" name="save"></ion-icon>
                    Save
                  </ion-button>
                  <ion-button fill="clear" color="danger" @click=${async () => this.settings = await trap(api.loadUserSettings, null)}>
                    <ion-icon slot="start" name="arrow-undo"></ion-icon>
                    Reset
                  </ion-button>
                </ion-card>
              </form>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-content>
    `;
  }

  private async saveUserSettings() {
    if (isNull(this.settings)) {
      console.error('Cannot save settings: settings are null.');
      return;
    }

    try {
      const { error } = await api.client.PUT('/users/current/settings', {
        body: this.settings
      });

      if (error) {
        throw new Error('Failed to save preferences.', { cause: error });
      }
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save preferences.');
    }
  }

  async onSaveSettingsClicked() {
    if (this.form && !this.form.reportValidity()) {
      return;
    }

    if ((this.imageInput?.files?.length ?? 0) > 0) {
      try {
        const file = this.imageInput!.files![0];
        await showLoading(
          async () => {
            const { error, response: resp } = await api.client.POST('/uploads', {
              body: file,
              bodySerializer(body) {
                return fileContentSerializer(body, file);
              }
            });

            if (error) {
              throw new Error('Failed to upload image.', { cause: error });
            }

            this.settings = {
              ...this.settings,
              homeImageUrl: resp.headers.get('location') ?? '',
              favoriteTags: this.settings?.favoriteTags ?? []
            };
          },
          'Uploading image...'
        );

        this.imageInput!.value = '';
      } catch (ex) {
        console.error(ex);
        await showToast('Failed to upload image.');
      }
    }

    await this.saveUserSettings();
  }
}
