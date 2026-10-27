import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

export { fetchMocker };

if (typeof document !== 'undefined' && typeof document.execCommand !== 'function') {
  document.execCommand = () => false;
}

