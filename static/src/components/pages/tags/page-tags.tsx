import { Gesture } from '@ionic/core';
import { Component, Element, h, Host, Method, State } from '@stencil/core';
import { SortDir, Tag, TagSortBy } from '../../../helpers/schema.gen';
import { api } from '../../../helpers/api';
import { ResultsPerPage, showResultsPerPageAlert } from '../../../helpers/modals';
import { ComponentWithActivatedCallback, createSwipeGesture, isNull } from '../../../helpers/utils';
import { getDefaultSearchFilter, SwipeDirection } from '../../../models';
import state from '../../../stores/state';

@Component({
  tag: 'page-tags',
  styleUrl: 'page-tags.css'
})
export class PageTags implements ComponentWithActivatedCallback {
  @Element() el!: HTMLPageTagsElement;
  private gesture: Gesture | null = null;

  @State() tags: Tag[] | null = null;
  @State() sortBy: TagSortBy = TagSortBy.Count;
  @State() sortDir: SortDir = SortDir.Desc;
  @State() page = 1;
  @State() numPages = 1;
  @State() resultsPerPage: ResultsPerPage = 60;

  async connectedCallback() {
    this.gesture = createSwipeGesture(this.el, swipe => {
      switch (swipe) {
        case SwipeDirection.Right:
          if (this.page > 1) {
            this.setPage(this.page - 1);
          }
          break;
        case SwipeDirection.Left:
          if (this.page < this.numPages) {
            this.setPage(this.page + 1);
          }
          break;
      }
    });
    this.gesture.enable();
    await this.load();
  }

  disconnectedCallback() {
    this.gesture?.destroy();
    this.gesture = null;
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
              <ion-button color="secondary" onClick={() => this.onSortByClicked()}>
                <ion-icon slot="start" icon='swap-vertical' />
                {this.sortBy}
              </ion-button>
              <ion-button color="secondary" onClick={() => this.onSortDirClicked()}>
                <ion-icon slot="start" icon={this.sortDir === SortDir.Asc ? 'arrow-up' : 'arrow-down'} />
                {this.sortDir}
              </ion-button>
              <ion-button color="secondary" onClick={() => this.onResultsPerPageClicked()}>
                {this.resultsPerPage}
                <ion-icon slot="end" icon="caret-down" />
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content>
          <ion-grid class="no-pad">
            <ion-row>
              {this.tags?.map(item =>
                <ion-col key={item.tag} size="12" size-md="6" size-lg="4" size-xl="3">
                  <ion-item href="/recipes" onClick={() => this.onTagClicked(item.tag)}>
                    <ion-label>{item.tag}</ion-label>
                    <ion-icon slot="end" name="bookmark" size="small" />
                    <ion-note slot="end">{item.count}</ion-note>
                  </ion-item>
                </ion-col>
              )}
            </ion-row>
          </ion-grid>
        </ion-content>

        <ion-footer>
          <ion-toolbar>
            <page-navigator
              class="ion-justify-content-center"
              color="secondary"
              page={this.page}
              numPages={this.numPages}
              onPageChanged={e => this.setPage(e.detail)}
            />
          </ion-toolbar>
        </ion-footer>
      </Host>
    );
  }

  private async load() {
    try {
      const { data, error } = await api.client.GET('/tags', {
        params: {
          query: {
            sort: this.sortBy,
            dir: this.sortDir,
            page: this.page,
            count: this.resultsPerPage
          }
        }
      });

      if (error || isNull(data)) {
        throw new Error('Failed to load tags.', { cause: error });
      }

      this.tags = data.tags ?? [];
      this.numPages = Math.max(Math.ceil(data.total / this.resultsPerPage), 1);
    } catch (ex) {
      this.tags = null;
      this.numPages = 1;
      console.error(ex);
    }
  }

  private setPage(page: number) {
    this.page = page;
    this.load().catch(console.error);
  }

  private onSortByClicked() {
    this.sortBy = this.sortBy === TagSortBy.Tag ? TagSortBy.Count : TagSortBy.Tag;
    this.page = 1;
    this.load().catch(console.error);
  }

  private onSortDirClicked() {
    this.sortDir = this.sortDir === SortDir.Asc ? SortDir.Desc : SortDir.Asc;
    this.page = 1;
    this.load().catch(console.error);
  }

  private async onResultsPerPageClicked() {
    await showResultsPerPageAlert(this.resultsPerPage, count => {
      this.resultsPerPage = count;
      this.page = 1;
      this.load().catch(console.error);
    });
  }

  private onTagClicked(tag: string) {
    const filter = getDefaultSearchFilter();
    state.searchFilter = {
      ...filter,
      states: [],
      tags: [tag]
    };
  }
}
