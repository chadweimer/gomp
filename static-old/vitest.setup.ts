import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

export { fetchMocker };

// WORKAROUND: JSDOM does not implement document.execCommand, so we mock it to avoid errors in tests.
if (typeof document !== 'undefined' && typeof document.execCommand !== 'function') {
  document.execCommand = () => false;
}
