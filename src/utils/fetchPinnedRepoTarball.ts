import type { IExtractedFile } from '@/utils/downloadPublicRepoFiles.ts';
import { extractTarGz } from '@/utils/extractTarGz.ts';
import type { ITemplateRepoSnapshot } from '@/utils/parseTemplateRepo.ts';

export function pinnedRepoTarballUrl(template: ITemplateRepoSnapshot): string {
  return `https://codeload.github.com/${template.owner}/${template.repo}/tar.gz/${template.sha}`;
}

export async function fetchPinnedRepoTarball(
  template: ITemplateRepoSnapshot,
  fetchImpl: typeof fetch = fetch,
): Promise<IExtractedFile[]> {
  const url = pinnedRepoTarballUrl(template);
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download pinned tarball for ${template.owner}/${template.repo}@${template.sha} (${String(response.status)})`,
    );
  }

  const binaryData = await response.arrayBuffer();
  return extractTarGz(new Uint8Array(binaryData));
}
