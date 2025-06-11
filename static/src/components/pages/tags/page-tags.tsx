import { Component, h, Host, Method, State } from '@stencil/core';
import { SortDir } from '../../../generated';
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
  @State() sortDir: SortDir = SortDir.Desc;

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
        <ion-header>
          <ion-toolbar>
            <ion-buttons class="ion-justify-content-center">
              <ion-button color="secondary" onClick={() => this.sortDir = this.sortDir === SortDir.Asc ? SortDir.Desc : SortDir.Asc}>
                <ion-icon slot="start" icon={this.sortDir === SortDir.Asc ? 'arrow-up' : 'arrow-down'} />
                {this.sortDir}
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-grid class="no-pad">
            <ion-row>
              {!isNull(this.tags) ?
                Object.entries(this.tags).toSorted(([keyA, valA], [keyB, valB]) => this.compare(valA, valB)).map(([key, val]) =>
                  <ion-col key={key} size="12" size-md="6" size-lg="4" size-xl="3">
                    <ion-item href="/recipes" onClick={() => this.onTagClicked(key)}>
                      <ion-label>{key}</ion-label>
                      <ion-icon slot="end" name="bookmark" size="small" />
                      <ion-note slot="end">{val}</ion-note>
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

  private compare(a: number, b: number) {
    if( a < b ){
      return this.sortDir === SortDir.Asc ? -1 : 1;
    } else if( a > b ){
      return this.sortDir === SortDir.Asc ? 1 : -1;
    } 
    return 0;
  }
}
