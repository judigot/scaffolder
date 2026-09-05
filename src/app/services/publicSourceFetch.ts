/** Server-only, optional credential for public-source REST rate limits. */
export const fetchPublicGitHubSource: typeof fetch = (input, init) => {
  const url =
    typeof input === 'string'
      ? new URL(input)
      : input instanceof URL
        ? input
        : new URL(input.url);
  const token = process.env.SCAFFOLDER_SOURCE_GITHUB_TOKEN;
  const headers = new Headers(init?.headers);
  if (
    url.origin === 'https://api.github.com' &&
    token !== undefined &&
    token !== ''
  ) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers, redirect: 'error' });
};
