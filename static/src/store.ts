import { createStore } from '@stencil/store';
import { AppConfiguration, AppInfo, DefaultSearchFilter, DefaultSearchSettings, SearchFilter, SearchSettings, User } from './models';

interface AppState {
  appInfo: AppInfo;
  appConfig: AppConfiguration;
  jwtToken: string;
  currentUser?: User;
  searchFilter?: SearchFilter;
  searchSettings: SearchSettings;
  searchPage: number;
  searchResultCount?: number;
}

const { state, onChange } = createStore<AppState>({
  appInfo: {
    version: '<Unknown>'
  },
  appConfig: {
    title: 'GOMP: Go Meal Planner'
  },
  jwtToken: localStorage.getItem('jwtToken'),
  searchFilter: sessionStorage.getItem('searchFilter') ? JSON.parse(sessionStorage.getItem('searchFilter')) : new DefaultSearchFilter(),
  searchSettings: sessionStorage.getItem('searchSettings') ? JSON.parse(sessionStorage.getItem('searchSettings')) : new DefaultSearchSettings(),
  searchPage: sessionStorage.getItem('searchPage') ? JSON.parse(sessionStorage.getItem('searchPage')) : 1
});

onChange('searchFilter', val => val ? sessionStorage.setItem('searchFilter', JSON.stringify(val)) : sessionStorage.removeItem('searchFilter'));
onChange('searchSettings', val => val ? sessionStorage.setItem('searchSettings', JSON.stringify(val)) : sessionStorage.removeItem('searchSettings'));
onChange('searchPage', val => val ? sessionStorage.setItem('searchPage', JSON.stringify(val)) : sessionStorage.removeItem('searchPage'));

export default state;
