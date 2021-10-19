import { Component, Element, Host, h, State, Method } from '@stencil/core';
import { AppApi } from '../../../helpers/api';
import { showToast } from '../../../helpers/utils';
import { AppConfiguration } from '../../../models';
import state from '../../../store';

@Component({
  tag: 'page-admin-configuration',
  styleUrl: 'page-admin-configuration.css',
})
export class PageAdminConfiguration {
  @State() appTitle = 'GOMP: Go Meal Planner';

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
                        <ion-input value={this.appTitle} onIonChange={e => this.appTitle = e.detail.value} required />
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
      const appConfig = await AppApi.getConfiguration(this.el);
      this.appTitle = appConfig.title;
    } catch (ex) {
      console.error(ex);
    }
  }

  private async onSaveConfigurationClicked() {
    if (!this.appConfigForm.reportValidity()) {
      return;
    }

    try {
      const appConfig: AppConfiguration = {
        title: this.appTitle
      };
      await AppApi.putConfiguration(this.el, appConfig);
      state.appConfig = appConfig;
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save configuration.');
    }
  }

}
