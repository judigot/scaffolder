import type { IExtractedFile } from '@/utils/downloadPublicRepoFiles.ts';
import { extractTarGz } from '@/utils/extractTarGz.ts';
import { concatBytes } from '@/utils/concatBytes.ts';
import type { ITemplateRepoSnapshot } from '@/utils/parseTemplateRepo.ts';

export function pinnedRepoTarballUrl(template: ITemplateRepoSnapshot): string {
  return `https://codeload.github.com/${template.owner}/${template.repo}/tar.gz/${template.sha}`;
}

export async function fetchPinnedRepoTarball(
  template: ITemplateRepoSnapshot,
  fetchImpl: typeof fetch = fetch,
): Promise<IExtractedFile[]> {
  const url = pinnedRepoTarballUrl(template);
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to download pinned tarball for ${template.owner}/${template.repo}@${template.sha} (${String(response.status)})`,
    );
  }

  if (response.body === null) {
    throw new Error('Source archive is empty.');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    let complete = false;
    while (!complete) {
      const chunk = await reader.read();
      if (chunk.done) {
        complete = true;
        continue;
      }
      size += chunk.value.length;
      if (size > 25 * 1024 * 1024) {
        throw new Error('Source archive exceeds the 25 MiB download limit.');
      }
      chunks.push(chunk.value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return extractTarGz(concatBytes(chunks));
}
