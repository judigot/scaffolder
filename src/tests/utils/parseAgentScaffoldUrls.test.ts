import { describe, expect, it } from 'vitest';
import {
  ensureScaffolderBranchName,
  isProtectedBranchName,
  isSameTargetRepo,
  parseProjectReference,
  parsePullRequestUrl,
  parseTargetRepo,
  toScaffolderBranchName,
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

describe('isSameTargetRepo', () => {
  it('compares owner and repo case-insensitively', () => {
    expect(
      isSameTargetRepo(
        { owner: 'Judigot', repo: 'BookingWars' },
        { owner: 'judigot', repo: 'bookingwars' },
      ),
    ).toBe(true);
    expect(
      isSameTargetRepo(
        { owner: 'judigot', repo: 'bookingwars' },
        { owner: 'other', repo: 'repo' },
      ),
    ).toBe(false);
  });
});

describe('parsePullRequestUrl', () => {
  it('parses a GitHub pull request URL', () => {
    expect(
      parsePullRequestUrl('https://github.com/judigot/bookingwars/pull/2'),
    ).toEqual({
      owner: 'judigot',
      repo: 'bookingwars',
      prNumber: 2,
    });
  });

  it('parses a PR URL with a files tab suffix and .git', () => {
    expect(
      parsePullRequestUrl(
        'https://github.com/judigot/bookingwars.git/pull/12/files',
      ),
    ).toEqual({
      owner: 'judigot',
      repo: 'bookingwars',
      prNumber: 12,
    });
  });

  it('rejects a non-PR GitHub URL', () => {
    expect(() => {
      parsePullRequestUrl('https://github.com/judigot/bookingwars');
    }).toThrow('pull request');
  });
});

describe('scaffolder branch naming', () => {
  it('slugs spaces in auto-generated project branch names', () => {
    expect(toScaffolderBranchName('ORM Schema - Knex', 'ab12')).toBe(
      'scaffolder/ORM-Schema-Knex-ab12',
    );
  });

  it('slugs spaces in explicit branch names so they are valid git refs', () => {
    expect(ensureScaffolderBranchName('ORM Schema - Knex-ab12')).toBe(
      'scaffolder/ORM-Schema-Knex-ab12',
    );
    expect(
      ensureScaffolderBranchName('scaffolder/ORM Schema - Knex-ab12'),
    ).toBe('scaffolder/ORM-Schema-Knex-ab12');
  });
});
