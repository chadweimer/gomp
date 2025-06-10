import { Component, h, Host, Method, State } from '@stencil/core';
import { recipesApi } from '../../../helpers/api';
import { isNull, redirect } from '../../../helpers/utils';
import state from '../../../stores/state';
import { getDefaultSearchFilter } from '../../../models';

@Component({
  tag: 'page-tags',
  styleUrl: 'page-tags.css'
})
export class PageTags {
  @State() tags: { [tag: string]: number } | null;

  async connectedCallback() {
    await this.load();
  }

  @Method()
  async activatedCallback() {
    await this.load();
  }

  render() {
    return (
      <Host>
        <ion-content>
          <ion-grid class="no-pad">
            <ion-row>
              {!isNull(this.tags) ?
                Object.entries(this.tags).map(([key, val]) =>
                  <ion-col key={key} size="12" size-md="6" size-lg="4" size-xl="3">
                    <ion-item href="/recipes" lines="none"
                      onClick={() => this.onTagClicked(key)}>
                      <ion-label>{key} ({val})</ion-label>
                    </ion-item>
                  </ion-col>
                )
                : ''}
            </ion-row>
          </ion-grid>
        </ion-content>
      </Host>
    );
  }

  private async load() {
    try {
      this.tags = await recipesApi.getAllTags();
    } catch (ex) {
      this.tags = null;
      console.error(ex);
    }
  }

  private async onTagClicked(tag: string) {
    const filter = getDefaultSearchFilter();
    state.searchFilter = {
      ...filter,
      tags: [tag]
    };
    // await redirect('/recipes');
  }
}
