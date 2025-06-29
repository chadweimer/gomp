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
                      <ion-item lines="full">
                        <ion-input label="Application Title" label-placement="stacked" value={this.appConfig.title}
                          autocorrect="on"
                          spellcheck
                          required
                          onIonBlur={e => this.appConfig = { ...this.appConfig, title: e.target.value as string }} />
                      </ion-item>
                    </ion-card-content>
                    <ion-button fill="clear" color="primary" onClick={() => this.onSaveConfigurationClicked()}>
                      <ion-icon slot="start" name="save" />
                      Save
                    </ion-button>
                    <ion-button fill="clear" color="danger" onClick={() => this.loadAppConfiguration()}>
                      <ion-icon slot="start" name="arrow-undo" />
                      Reset
                    </ion-button>
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
      this.appConfig = await appApi.getConfiguration();
    } catch (ex) {
      console.error(ex);
    }
  }

  private async onSaveConfigurationClicked() {
    if (!this.appConfigForm.reportValidity()) {
      return;
    }

    try {
      await appApi.saveConfiguration({ appConfiguration: this.appConfig });
      appConfig.config = this.appConfig;
    } catch (ex) {
      console.error(ex);
      showToast('Failed to save configuration.');
    }
  }

}
