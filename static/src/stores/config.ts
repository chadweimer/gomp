import { createStore } from '@stencil/store';
import { AppConfiguration, AppInfo } from '../api/schema.gen';

interface AppConfig {
  info: AppInfo;
  config: AppConfiguration;
}

const { state: appConfig } = createStore<AppConfig>({
  info: {
    copyright: 'Copyright © Chad Weimer',
    version: '<Unknown>'
  },
  config: {
    title: 'GOMP: Go Meal Planner'
  }
});

export default appConfig;
