import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { AppConfiguration } from '../../../generated';
import { appApi } from '../../../helpers/api';
import { showToast } from '../../../helpers/utils';
import appConfig from '../../../stores/config';

@Component({
  tag: 'page-admin-configuration',
  styleUrl: 'page-admin-configuration.css',
})
export class PageAdminConfiguration {
  @State() appConfig: AppConfiguration = {
    title: 'GOMP: Go Meal Planner'
  };

  @Element() el!: HTMLPageAdminConfigurationElement;
  private appConfigForm!: HTMLFormElement;

  @Method()
  async activatedCallback() {
    await this.loadAppConfiguration();
  }

  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid class="no-pad" fixed>
            <ion-row>
              <ion-col>
                <form onSubmit={e => e.preventDefault()} ref={el => this.appConfigForm = el}>
                  <ion-card>
                    <ion-card-content>
                      <ion-item>
                        <ion-label position="stacked">Application Title</ion-label>
                        <ion-input value={this.appConfig.title} onIonChange={e => this.appConfig = { ...this.appConfig, title: e.detail.value }} required />
                      </ion-item>
                    </ion-card-content>
                    <ion-footer>
                      <ion-toolbar>
                        <ion-buttons slot="primary">
                          <ion-button color="primary" onClick={() => this.onSaveConfigurationClicked()}>Save</ion-button>
                        </ion-buttons>
                        <ion-buttons slot="secondary">
                          <ion-button color="danger" onClick={() => this.loadAppConfiguration()}>Reset</ion-button>
                        </ion-buttons>
                      </ion-toolbar>
                    </ion-footer>
                  </ion-card>
                </form>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </Host>
    );
  }

  private async loadAppConfiguration() {
    try {
      ({ data: this.appConfig } = await appApi.getConfiguration());
    } catch (ex) {
      console.error(ex);
    }
  }

  private async onSaveConfigurationClicked() {
    if (!this.appConfigForm.reportValidity()) {
      return;
    }

    try {
      await appApi.saveConfiguration(this.appConfig);
      appConfig.config = this.appConfig;
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save configuration.');
    }
  }

}
