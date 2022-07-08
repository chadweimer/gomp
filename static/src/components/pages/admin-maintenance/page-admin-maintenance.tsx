import { alertController } from '@ionic/core';
import { Component, Host, h } from '@stencil/core';
import { appApi } from '../../../helpers/api';
import { enableBackForOverlay, showToast } from '../../../helpers/utils';

@Component({
  tag: 'page-admin-maintenance',
  styleUrl: 'page-admin-maintenance.css',
})
export class PageAdminMaintenance {
  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid class="no-pad" fixed>
            <ion-row>
              <ion-col>
                <ion-card>
                  <ion-card-content>
                    <ion-buttons>
                      <ion-button color="danger" fill="solid" onClick={() => this.optimizeImagesClicked()}>Optimize All Images</ion-button>
                    </ion-buttons>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-content>
      </Host>
    );
  }

  private async optimizeImages() {
    try {
      await appApi.performMaintenance({
        op: 'optimizeImages'
      });
    } catch(ex) {
      console.error(ex);
      showToast('Failed to optimize images.');
    }
  }

  private async optimizeImagesClicked() {
    await enableBackForOverlay(async () => {
      const confirmation = await alertController.create({
        header: 'Optimize All Images?',
        message: 'Are you sure you want to optimize all images? This operation cannot be undone.',
        buttons: [
          'No',
          {
            text: 'Yes',
            handler: async () => {
              await this.optimizeImages();
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
