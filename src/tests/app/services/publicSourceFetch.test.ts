import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicGitHubSource } from '@/app/services/publicSourceFetch.ts';

const originalFetch = globalThis.fetch;
const originalToken = process.env.SCAFFOLDER_SOURCE_GITHUB_TOKEN;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) {
    delete process.env.SCAFFOLDER_SOURCE_GITHUB_TOKEN;
  } else {
    process.env.SCAFFOLDER_SOURCE_GITHUB_TOKEN = originalToken;
  }
});
describe('server public-source authentication', () => {
  it('sends the source credential only to the fixed REST API origin and forbids redirects', async () => {
    process.env.SCAFFOLDER_SOURCE_GITHUB_TOKEN = 'source-secret';
    const mockedFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({}));
    globalThis.fetch = mockedFetch;
    await fetchPublicGitHubSource('https://api.github.com/repos/alice/starter');
    await fetchPublicGitHubSource(
      'https://codeload.github.com/alice/starter/tar.gz/sha',
    );
    expect(
      new Headers(mockedFetch.mock.calls[0]?.[1]?.headers).get('authorization'),
    ).toBe('Bearer source-secret');
    expect(
      new Headers(mockedFetch.mock.calls[1]?.[1]?.headers).has('authorization'),
    ).toBe(false);
    expect(mockedFetch.mock.calls[0]?.[1]?.redirect).toBe('error');
  });
});
