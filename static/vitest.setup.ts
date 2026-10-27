import createFetchMock from 'vitest-fetch-mock';
import { vi, afterEach } from 'vitest';
import { fixtureCleanup } from '@open-wc/testing-helpers';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

export { fetchMocker };

if (typeof document !== 'undefined' && typeof document.execCommand !== 'function') {
  document.execCommand = () => false;
}

afterEach(() => {
  fixtureCleanup();
});

