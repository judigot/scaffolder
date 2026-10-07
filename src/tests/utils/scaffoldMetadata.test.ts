import { describe, expect, it } from 'vitest';
import { AgentScaffoldRequestSchema } from '@/schemas/agentScaffold.ts';
import { addScaffoldMetadata, createScaffoldMetadata } from '@/utils/scaffoldMetadata.ts';

const request = {
  project: 'hono-react-monorepo',
  schemaInfo: '<@@SCHEMA@@>\n@user:id:u#pk\n<@@/SCHEMA@@>',
  output: 'zip' as const,
};

describe('single-file scaffolding metadata', () => {
  it('records allowlisted inputs and honest unknown provenance deterministically', () => {
    const input = { ...request, githubToken: 'not-a-real-test-token', prBody: 'private-test-body' };
    const metadata = createScaffoldMetadata(input, {});
    expect(metadata).toEqual(createScaffoldMetadata(input, {}));
    expect(metadata.request.schemaInfo).toBe(request.schemaInfo);
    expect(metadata.provenance.generator.commitSha).toBeNull();
    expect(metadata.verification.applicationChecks).toEqual([]);
    expect(JSON.stringify(metadata)).not.toContain('not-a-real-test-token');
    expect(JSON.stringify(metadata)).not.toContain('private-test-body');
  });

  it('makes repository creation safe to replay and preserves context', () => {
    const metadata = createScaffoldMetadata({
      ...request, output: 'github_pr', target_repo: 'judigot/bookingwars', create_repo: true,
      context: { documents: ['https://app.notion.com/p/example'], unresolvedDecisions: ['Customer accounts'] },
    }, { templateSource: 'https://github.com/judigot/template-monorepo', templateSha: 'a'.repeat(40), recipeSha: 'b'.repeat(40) });
    expect(metadata.request.create_repo).toBe(false);
    expect(metadata.context.unresolvedDecisions).toEqual(['Customer accounts']);
    expect(metadata.provenance.template.resolvedSha).toBe('a'.repeat(40));
  });

  it('adds just one JSON file and replaces old metadata without deleting siblings', () => {
    const metadata = createScaffoldMetadata(request, {});
    const structure = addScaffoldMetadata([
      { type: 'folder', name: '.scaffolder', children: [
        { type: 'file', name: 'manifest.json', content: 'old' },
        { type: 'file', name: 'notes.txt', content: 'keep' },
      ] },
    ], metadata);
    const folder = structure[0];
    expect(folder?.type).toBe('folder');
    if (folder?.type !== 'folder') throw new Error('Missing metadata folder');
    expect(folder.children.map((file) => file.name)).toEqual(['notes.txt', 'manifest.json']);
    expect(folder.children[0]).toMatchObject({ content: 'keep' });
  });

  it('rejects reserved-path collisions rather than silently deleting files', () => {
    expect(() => addScaffoldMetadata([{ type: 'file', name: '.scaffolder', content: 'keep' }], createScaffoldMetadata(request, {}))).toThrow();
  });

  it('accepts public context but rejects credential-bearing context fields', () => {
    expect(AgentScaffoldRequestSchema.safeParse({ ...request, context: { documents: ['https://example.com/prd'], unresolvedDecisions: [] } }).success).toBe(true);
    expect(AgentScaffoldRequestSchema.safeParse({ ...request, context: { apiKey: 'not-a-real-test-key' } }).success).toBe(false);
  });
});
