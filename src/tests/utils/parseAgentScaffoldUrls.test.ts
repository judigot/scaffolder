import { describe, expect, it } from 'vitest';
import {
  isProtectedBranchName,
  parseProjectReference,
  parseTargetRepo,
} from '@/utils/parseAgentScaffoldUrls.ts';

describe('parseProjectReference', () => {
  it('parses a GitHub tree URL into a project path', () => {
    const result = parseProjectReference(
      'https://github.com/judigot/scaffolder-files/tree/main/Projects/hono-react',
    );

    expect(result).toEqual({
      owner: 'judigot',
      repo: 'scaffolder-files',
      ref: 'main',
      projectName: 'hono-react',
      projectYamlPath: '/Projects/hono-react/structure.yaml',
    });
  });

  it('accepts a local Projects path', () => {
    const result = parseProjectReference('Projects/hono-react');

    expect(result.projectName).toBe('hono-react');
    expect(result.projectYamlPath).toBe('/Projects/hono-react/structure.yaml');
  });

  it('accepts a bare project folder name', () => {
    const result = parseProjectReference('hono-react');

    expect(result.projectName).toBe('hono-react');
    expect(result.projectYamlPath).toBe('/Projects/hono-react/structure.yaml');
  });

  it('rejects an empty project', () => {
    expect(() => {
      parseProjectReference('   ');
    }).toThrow('project is required');
  });
});

describe('parseTargetRepo', () => {
  it('parses a GitHub repository URL', () => {
    expect(parseTargetRepo('https://github.com/judigot/bookingwars')).toEqual({
      owner: 'judigot',
      repo: 'bookingwars',
    });
  });

  it('parses owner/repo shorthand', () => {
    expect(parseTargetRepo('judigot/bookingwars')).toEqual({
      owner: 'judigot',
      repo: 'bookingwars',
    });
  });

  it('strips .git from repository URLs', () => {
    expect(
      parseTargetRepo('https://github.com/judigot/bookingwars.git'),
    ).toEqual({
      owner: 'judigot',
      repo: 'bookingwars',
    });
  });

  it('rejects an invalid target repo', () => {
    expect(() => {
      parseTargetRepo('not-a-repo');
    }).toThrow('target_repo');
  });
});

describe('isProtectedBranchName', () => {
  it('treats main, master, and the repo default branch as protected', () => {
    expect(isProtectedBranchName('main', 'develop')).toBe(true);
    expect(isProtectedBranchName('master', 'develop')).toBe(true);
    expect(isProtectedBranchName('develop', 'develop')).toBe(true);
    expect(isProtectedBranchName('scaffolder/hono-react-ab12', 'main')).toBe(
      false,
    );
  });
});
