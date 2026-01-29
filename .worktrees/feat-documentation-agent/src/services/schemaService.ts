import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { isUsingLocalFiles } from '@/hooks/useUserFiles.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';

interface ISaveSchemaParams {
  schemaName: string;
  content: ISchemaInfo[];
  publicRepoURL?: string;
  getAccessToken?: () => Promise<string>;
}

interface IDeleteSchemaParams {
  schemaName: string;
  publicRepoURL?: string;
  getAccessToken?: () => Promise<string>;
}

interface ISchemaOperationResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Saves a schema to either local files or GitHub repository
 */
export const saveSchema = async (
  params: ISaveSchemaParams,
): Promise<ISchemaOperationResult> => {
  const { schemaName, content, publicRepoURL, getAccessToken } = params;

  const filePath = `Schemas/${schemaName}.json`;
  const jsonContent = JSON.stringify(content, null, 2);

  if (isUsingLocalFiles) {
    return saveSchemaLocally(filePath, jsonContent);
  }

  return saveSchemaToGitHub(
    filePath,
    jsonContent,
    publicRepoURL,
    getAccessToken,
  );
};

/**
 * Saves a schema to local files (development mode)
 */
const saveSchemaLocally = async (
  filePath: string,
  content: string,
): Promise<ISchemaOperationResult> => {
  try {
    const response = await fetch(`${getApiUrl()}/save-local-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath, content }),
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      const isErrorResponse = (val: unknown): val is { error: string } => {
        if (typeof val !== 'object' || val === null) {
          return false;
        }
        if (!('error' in val)) {
          return false;
        }
        /* eslint-disable-next-line no-type-assertion/no-type-assertion */
        const errorProp = (val as { error: unknown }).error;
        return typeof errorProp === 'string';
      };

      const errorMessage = isErrorResponse(data)
        ? data.error
        : 'Failed to save schema';
      return {
        success: false,
        message: 'Failed to save schema locally',
        error: errorMessage,
      };
    }

    return {
      success: true,
      message: 'Schema saved successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to save schema locally',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Saves a schema to GitHub repository (production mode)
 */
const saveSchemaToGitHub = async (
  filePath: string,
  content: string,
  publicRepoURL?: string,
  getAccessToken?: () => Promise<string>,
): Promise<ISchemaOperationResult> => {
  if (publicRepoURL === undefined || publicRepoURL === '') {
    return {
      success: false,
      message: 'GitHub repository URL is required',
      error: 'No repository URL provided',
    };
  }

  if (getAccessToken === undefined) {
    return {
      success: false,
      message: 'Authentication required',
      error: 'No access token provider available',
    };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${getApiUrl()}/create-github-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        publicRepoURL,
        filePath,
        content,
        commitMessage: `Update schema: ${filePath}`,
      }),
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      const isErrorResponse = (val: unknown): val is { error: string } => {
        if (typeof val !== 'object' || val === null) {
          return false;
        }
        if (!('error' in val)) {
          return false;
        }
        /* eslint-disable-next-line no-type-assertion/no-type-assertion */
        const errorProp = (val as { error: unknown }).error;
        return typeof errorProp === 'string';
      };

      const errorMessage = isErrorResponse(data)
        ? data.error
        : 'Failed to save schema to GitHub';
      return {
        success: false,
        message: 'Failed to save schema to GitHub',
        error: errorMessage,
      };
    }

    return {
      success: true,
      message: 'Schema saved to GitHub successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to save schema to GitHub',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Deletes a schema from either local files or GitHub repository
 */
export const deleteSchema = async (
  params: IDeleteSchemaParams,
): Promise<ISchemaOperationResult> => {
  const { schemaName, publicRepoURL, getAccessToken } = params;

  const filePath = `Schemas/${schemaName}.json`;

  if (isUsingLocalFiles) {
    return deleteSchemaLocally(filePath);
  }

  return deleteSchemaFromGitHub(filePath, publicRepoURL, getAccessToken);
};

/**
 * Deletes a schema from local files (development mode)
 */
const deleteSchemaLocally = async (
  filePath: string,
): Promise<ISchemaOperationResult> => {
  try {
    const response = await fetch(`${getApiUrl()}/delete-local-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      const isErrorResponse = (val: unknown): val is { error: string } => {
        if (typeof val !== 'object' || val === null) {
          return false;
        }
        if (!('error' in val)) {
          return false;
        }
        /* eslint-disable-next-line no-type-assertion/no-type-assertion */
        const errorProp = (val as { error: unknown }).error;
        return typeof errorProp === 'string';
      };

      const errorMessage = isErrorResponse(data)
        ? data.error
        : 'Failed to delete schema';
      return {
        success: false,
        message: 'Failed to delete schema locally',
        error: errorMessage,
      };
    }

    return {
      success: true,
      message: 'Schema deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to delete schema locally',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Deletes a schema from GitHub repository (production mode)
 */
const deleteSchemaFromGitHub = async (
  filePath: string,
  publicRepoURL?: string,
  getAccessToken?: () => Promise<string>,
): Promise<ISchemaOperationResult> => {
  if (publicRepoURL === undefined || publicRepoURL === '') {
    return {
      success: false,
      message: 'GitHub repository URL is required',
      error: 'No repository URL provided',
    };
  }

  if (getAccessToken === undefined) {
    return {
      success: false,
      message: 'Authentication required',
      error: 'No access token provider available',
    };
  }

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${getApiUrl()}/delete-github-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        publicRepoURL,
        filePath,
        commitMessage: `Delete schema: ${filePath}`,
      }),
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      const isErrorResponse = (val: unknown): val is { error: string } => {
        if (typeof val !== 'object' || val === null) {
          return false;
        }
        if (!('error' in val)) {
          return false;
        }
        /* eslint-disable-next-line no-type-assertion/no-type-assertion */
        const errorProp = (val as { error: unknown }).error;
        return typeof errorProp === 'string';
      };

      const errorMessage = isErrorResponse(data)
        ? data.error
        : 'Failed to delete schema from GitHub';
      return {
        success: false,
        message: 'Failed to delete schema from GitHub',
        error: errorMessage,
      };
    }

    return {
      success: true,
      message: 'Schema deleted from GitHub successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to delete schema from GitHub',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
