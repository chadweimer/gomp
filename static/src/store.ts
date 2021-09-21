import { createStore } from '@stencil/store';
import { AppConfiguration, AppInfo, User } from './models';

const { state } = createStore({
  appInfo: {
    version: '<Unknown>'
  } as AppInfo,
  appConfig: {
    title: 'GOMP: Go Meal Planner'
  } as AppConfiguration,
  currentUser: null as User
});

export default state;
