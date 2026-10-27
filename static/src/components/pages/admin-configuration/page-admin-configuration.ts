import { LitElement, html } from 'lit';
import { customElement, state as litState, query } from 'lit/decorators.js';
import { AppConfiguration } from '../../../helpers/schema.gen';
import { api } from '../../../helpers/api';
import { showToast } from '../../../helpers/modals';
import { ComponentWithActivatedCallback } from '../../../helpers/utils';
import appConfig from '../../../stores/config';
import './page-admin-configuration.css';

@customElement('page-admin-configuration')
export class PageAdminConfiguration extends LitElement implements ComponentWithActivatedCallback {
  @litState() appConfiguration: AppConfiguration = {
    title: 'GOMP: Go Meal Planner'
  };

  @query('form') private form?: HTMLFormElement;

  protected createRenderRoot() {
    return this;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.activatedCallback().catch(console.error);
  }

  async activatedCallback() {
    await this.loadAppConfiguration();
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
                        label="Application Title"
                        label-placement="stacked"
                        .value=${this.appConfiguration?.title ?? ''}
                        autocorrect="on"
                        spellcheck
                        required
                        @ionBlur=${(e: Event) => {
        const val = (e.currentTarget as HTMLIonInputElement).value as string;
        this.appConfiguration = { ...this.appConfiguration, title: val };
      }}
                      ></ion-input>
                    </ion-item>
                  </ion-card-content>
                  <ion-button fill="clear" color="primary" @click=${() => this.onSaveConfigurationClicked()}>
                    <ion-icon slot="start" name="save"></ion-icon>
                    Save
                  </ion-button>
                  <ion-button fill="clear" color="danger" @click=${() => this.loadAppConfiguration()}>
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

  async loadAppConfiguration() {
    try {
      const { data: config, error } = await api.client.GET('/app/configuration');

      if (error) {
        throw new Error('Failed to load configuration.', { cause: error });
      }

      this.appConfiguration = config;
    } catch (ex) {
      console.error(ex);
    }
  }

  async onSaveConfigurationClicked() {
    if (this.form && !this.form.reportValidity()) {
      return;
    }

    try {
      const { error } = await api.client.PUT('/app/configuration', {
        body: this.appConfiguration
      });

      if (error) {
        throw new Error('Failed to save configuration.', { cause: error });
      }

      appConfig.config = this.appConfiguration;
    } catch (ex) {
      console.error(ex);
      await showToast('Failed to save configuration.');
    }
  }
}
