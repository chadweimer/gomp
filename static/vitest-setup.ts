import createFetchMock from 'vitest-fetch-mock';
import { vi } from 'vitest';

await import('./www/static/build/app.esm.js');

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

export { fetchMocker };
