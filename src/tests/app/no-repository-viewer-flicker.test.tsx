import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import type { IFile, IStructure } from '@/components/FileViewer.tsx';

const mockUserFiles: IStructure = [
  { type: 'file', name: 'ROOT.md', content: 'proto' },
];

const mockProjects: IFile[] = [
  {
    type: 'file',
    name: 'TestProject',
    content: 'name: TestProject\n',
    uniqueId: '/Projects/TestProject',
  },
];

const RepositoryViewerGuard = ({
  queryUserFiles,
  queryProjects,
}: {
  queryUserFiles?: IStructure;
  queryProjects: IFile[];
}) => {
  const shouldShowRepositoryViewer =
    Boolean(queryUserFiles && queryUserFiles.length > 0) &&
    queryProjects.length === 0;

  return shouldShowRepositoryViewer ? (
    <div>Repository Viewer</div>
  ) : (
    <div role="status">Project UI</div>
  );
};

describe('Repository viewer guard', () => {
  it('shows the repository viewer when no projects exist', () => {
    const { getByText, queryByRole } = render(
      <RepositoryViewerGuard
        queryUserFiles={mockUserFiles}
        queryProjects={[]}
      />,
    );
    expect(getByText(/Repository Viewer/i)).toBeInTheDocument();
    expect(queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides the repository viewer when projects exist', () => {
    const { queryByText, getByRole } = render(
      <RepositoryViewerGuard
        queryUserFiles={mockUserFiles}
        queryProjects={mockProjects}
      />,
    );
    expect(queryByText(/Repository Viewer/i)).not.toBeInTheDocument();
    expect(getByRole('status')).toHaveTextContent('Project UI');
  });
});
