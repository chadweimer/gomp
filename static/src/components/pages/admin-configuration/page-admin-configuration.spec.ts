import { fixture, html } from '@open-wc/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { AppConfiguration } from '../../../helpers/schema.gen';
import appConfig from '../../../stores/config';
import { clearState } from '../../../stores/state';
import './page-admin-configuration';
import { PageAdminConfiguration } from './page-admin-configuration';

describe('page-admin-configuration', () => {
  const originalFetch = globalThis.fetch;

  const mockConfig: AppConfiguration = {
    title: 'Custom Meal Planner',
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchMocker.resetMocks();
    clearState();
    appConfig.config = { title: 'GOMP: Go Meal Planner' };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fetchMocker.resetMocks();
    clearState();
    vi.restoreAllMocks();
  });

  it('builds and renders initial state', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockConfig));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await root.updateComplete;

    const input = root.querySelector('ion-input');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('label')).toBe('Application Title');

    const buttons = root.querySelectorAll('ion-button');
    expect(buttons).toHaveLength(2);
  });

  it('loads configuration on activatedCallback', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockConfig));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await root.activatedCallback();
    await root.updateComplete;

    const input = root.querySelector<HTMLIonInputElement>('ion-input');
    expect(input?.getAttribute('.value') ?? (input as any).value).toBe('Custom Meal Planner');
  });

  it('saves configuration and updates store on save click', async () => {
    const requests: Request[] = [];
    fetchMocker.mockResponse((req: Request) => {
      requests.push(req);
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        return Promise.resolve(JSON.stringify(mockConfig));
      }
      if (req.url.match(/\/app\/configuration$/) && req.method === 'PUT') {
        return Promise.resolve('{}');
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await root.activatedCallback();
    await root.updateComplete;

    const input = root.querySelector<HTMLIonInputElement>('ion-input');
    if (input) {
      input.value = 'Brand New Title';
      input.dispatchEvent(new CustomEvent('ionBlur'));
    }
    await root.updateComplete;

    await root.onSaveConfigurationClicked();
    await root.updateComplete;

    const putReq = requests.find(r => r.url.match(/\/app\/configuration$/) && r.method === 'PUT');
    expect(putReq).toBeDefined();
    const body = (await putReq?.clone().json()) as AppConfiguration;
    expect(body.title).toBe('Brand New Title');
    expect(appConfig.config.title).toBe('Brand New Title');
  });

  it('reloads configuration on reset click', async () => {
    let getCount = 0;
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/configuration$/) && req.method === 'GET') {
        getCount++;
        return Promise.resolve(JSON.stringify(mockConfig));
      }
      return Promise.resolve('{}');
    });

    const root = await fixture<PageAdminConfiguration>(html`<page-admin-configuration></page-admin-configuration>`);
    await root.activatedCallback();
    await root.updateComplete;

    const resetButton = root.querySelectorAll('ion-button')[1];
    resetButton?.click();
    await root.updateComplete;

    expect(getCount).toBeGreaterThanOrEqual(2);
  });
});

