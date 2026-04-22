import { render, h, describe, it, expect } from '@stencil/vitest';
import { fetchMocker } from '../../../../vitest.setup';
import { AppConfiguration, AppInfo } from '../../../generated';
import '../app-root';

describe('app-root', () => {
  it('builds', async () => {
    fetchMocker.mockResponse((req: Request) => {
      if (req.url.match(/\/app\/info$/)) {
        const appInfo: AppInfo = {
          copyright: "© 2026 My Recipe App",
          version: "1.0.0",
        };
        return {
          status: 200,
          body: JSON.stringify(appInfo),
        };
      } else if (req.url.match(/\/app\/configuration$/)) {
        const appConfig: AppConfiguration = {
          title: "My Recipe App"
        };
        return {
          status: 200,
          body: JSON.stringify(appConfig),
        };
      }
      return {
        status: 404,
      };
    });
    const { root } = await render(<app-root />);
    expect(root).toHaveClass('hydrated');
  });
});
