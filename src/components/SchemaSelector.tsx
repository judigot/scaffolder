import { useEffect, useCallback, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Save as SaveIcon,
  Add as AddIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useSchemaStore } from '@/useSchemaStore.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';
import { useFormStore } from '@/useFormStore.ts';
import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import { saveSchema, deleteSchema } from '@/services/schemaService.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';

function SchemaSelector() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const { promptModal, newValue } = useModalStore();
  const { publicRepoURL } = useFormStore();
  const queryClient = useQueryClient();

  const {
    availableSchemas,
    selectedSchemaName,
    loadSchemasFromUserFiles,
    selectSchema,
    setOriginalSchemaContent,
    isDirty,
    generateUniqueSchemaName,
    generateDuplicateName,
    isSaving,
    isDeleting,
    setSaving,
    setDeleting,
    setSaveError,
    setDeleteError,
    saveError,
    deleteError,
  } = useSchemaStore();

  const { userFiles } = useMockDatabaseStore();
  const { schemaInfo, setSchemaInfo } = useTransformationsStore();

  /* Invalidate user files query to trigger a refetch */
  const invalidateUserFiles = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['userFiles'] });
  }, [queryClient]);

  /* Track if schema is dirty - recompute when schemaInfo changes */
  const isCurrentSchemaDirty = useMemo(() => {
    return isDirty(schemaInfo);
  }, [schemaInfo, isDirty]);

  /* Load schemas from userFiles when they change */
  useEffect(() => {
    loadSchemasFromUserFiles(userFiles);
  }, [userFiles, loadSchemasFromUserFiles]);

  /* Handle schema selection change */
  const handleSchemaChange = useCallback(
    async (newSchemaName: string) => {
      /* If dirty, show confirmation dialog */
      if (isCurrentSchemaDirty) {
        const confirmed = await promptModal({
          title: 'Unsaved Changes',
          description:
            'You have unsaved changes. Are you sure you want to switch schemas? Your changes will be lost.',
          confirmButtonText: 'Switch Schema',
          denyButtonText: 'Cancel',
        });

        if (!confirmed) {
          return;
        }
      }

      if (newSchemaName === '__master__') {
        /* Load master schema */
        selectSchema(null);
        /* Deep clone master schema - masterSchema is already ISchemaInfo[] */
        const clonedMasterSchema = structuredClone(masterSchema);
        setSchemaInfo(clonedMasterSchema);
        setOriginalSchemaContent(masterSchema);
        return;
      }

      const schemaContent = selectSchema(newSchemaName);
      if (schemaContent) {
        setSchemaInfo(schemaContent);
      }
    },
    [
      isCurrentSchemaDirty,
      promptModal,
      selectSchema,
      setSchemaInfo,
      setOriginalSchemaContent,
    ],
  );

  /* Handle dropdown change */
  const onDropdownChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      void handleSchemaChange(e.target.value);
    },
    [handleSchemaChange],
  );

  /* Save current schema */
  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }

    let schemaName = selectedSchemaName;
    const isNewSchema = schemaName === null;

    /* If no schema is selected, prompt for a name */
    if (schemaName === null) {
      const inputName = await newValue({
        title: 'Save Schema As',
      });

      if (!inputName) {
        return;
      }

      schemaName = generateUniqueSchemaName(inputName);
    }

    setSaving(true);
    setSaveError(null);

    try {
      const result = await saveSchema({
        schemaName,
        content: schemaInfo,
        publicRepoURL,
        getAccessToken: isAuthenticated
          ? () => getAccessTokenSilently()
          : undefined,
      });

      if (!result.success) {
        setSaveError(result.error ?? 'Failed to save schema');
        return;
      }

      /* Update the original content to match saved content */
      setOriginalSchemaContent(schemaInfo);

      /* Refresh user files to show the new/updated schema */
      await invalidateUserFiles();

      /* If this was a new schema, select it in the store */
      if (isNewSchema) {
        /* We need to manually set the selected schema name since
           the schema file doesn't exist in availableSchemas yet */
        useSchemaStore.setState({ selectedSchemaName: schemaName });
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save schema',
      );
    } finally {
      setSaving(false);
    }
  }, [
    isSaving,
    selectedSchemaName,
    newValue,
    generateUniqueSchemaName,
    setSaving,
    setSaveError,
    schemaInfo,
    publicRepoURL,
    isAuthenticated,
    getAccessTokenSilently,
    setOriginalSchemaContent,
    invalidateUserFiles,
  ]);

  /* Create new schema */
  const handleCreate = useCallback(async () => {
    /* Check for unsaved changes */
    if (isCurrentSchemaDirty) {
      const confirmed = await promptModal({
        title: 'Unsaved Changes',
        description:
          'You have unsaved changes. Are you sure you want to create a new schema? Your changes will be lost.',
        confirmButtonText: 'Create New',
        denyButtonText: 'Cancel',
      });

      if (!confirmed) {
        return;
      }
    }

    const inputName = await newValue({
      title: 'New Schema Name',
    });

    if (!inputName) {
      return;
    }

    const schemaName = generateUniqueSchemaName(inputName);

    /* Create empty schema with default structure */
    const emptySchema: ISchemaInfo[] = [];

    setSaving(true);
    setSaveError(null);

    try {
      const result = await saveSchema({
        schemaName,
        content: emptySchema,
        publicRepoURL,
        getAccessToken: isAuthenticated
          ? () => getAccessTokenSilently()
          : undefined,
      });

      if (!result.success) {
        setSaveError(result.error ?? 'Failed to create schema');
        return;
      }

      /* Set the new schema as current */
      setSchemaInfo(emptySchema);
      setOriginalSchemaContent(emptySchema);

      /* Set the newly created schema as selected */
      useSchemaStore.setState({ selectedSchemaName: schemaName });

      /* Refresh user files to show the new schema */
      await invalidateUserFiles();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to create schema',
      );
    } finally {
      setSaving(false);
    }
  }, [
    isCurrentSchemaDirty,
    promptModal,
    newValue,
    generateUniqueSchemaName,
    setSaving,
    setSaveError,
    publicRepoURL,
    isAuthenticated,
    getAccessTokenSilently,
    setSchemaInfo,
    setOriginalSchemaContent,
    invalidateUserFiles,
  ]);

  /* Duplicate current schema */
  const handleDuplicate = useCallback(async () => {
    if (selectedSchemaName === null) {
      /* If master schema, create a copy of it */
      const inputName = await newValue({
        title: 'Save Master Schema Copy As',
      });

      if (!inputName) {
        return;
      }

      const schemaName = generateUniqueSchemaName(inputName);

      setSaving(true);
      setSaveError(null);

      try {
        const result = await saveSchema({
          schemaName,
          content: schemaInfo,
          publicRepoURL,
          getAccessToken: isAuthenticated
            ? () => getAccessTokenSilently()
            : undefined,
        });

        if (!result.success) {
          setSaveError(result.error ?? 'Failed to duplicate schema');
          return;
        }

        /* Refresh user files to show the duplicated schema */
        await invalidateUserFiles();
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : 'Failed to duplicate schema',
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    const duplicateName = generateDuplicateName(selectedSchemaName);

    const confirmed = await promptModal({
      title: 'Duplicate Schema',
      description: `Create a copy of "${selectedSchemaName}" as "${duplicateName}"?`,
      confirmButtonText: 'Duplicate',
      denyButtonText: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const result = await saveSchema({
        schemaName: duplicateName,
        content: schemaInfo,
        publicRepoURL,
        getAccessToken: isAuthenticated
          ? () => getAccessTokenSilently()
          : undefined,
      });

      if (!result.success) {
        setSaveError(result.error ?? 'Failed to duplicate schema');
        return;
      }

      /* Refresh user files to show the duplicated schema */
      await invalidateUserFiles();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to duplicate schema',
      );
    } finally {
      setSaving(false);
    }
  }, [
    selectedSchemaName,
    newValue,
    generateUniqueSchemaName,
    generateDuplicateName,
    promptModal,
    setSaving,
    setSaveError,
    schemaInfo,
    publicRepoURL,
    isAuthenticated,
    getAccessTokenSilently,
    invalidateUserFiles,
  ]);

  /* Delete current schema */
  const handleDelete = useCallback(async () => {
    if (selectedSchemaName === null) {
      await promptModal({
        title: 'Cannot Delete',
        description: 'The master schema cannot be deleted.',
        confirmButtonText: 'OK',
        denyButtonText: 'Cancel',
      });
      return;
    }

    const confirmed = await promptModal({
      title: 'Delete Schema',
      description: `Are you sure you want to delete "${selectedSchemaName}"? This action cannot be undone.`,
      confirmButtonText: 'Delete',
      denyButtonText: 'Cancel',
    });

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteSchema({
        schemaName: selectedSchemaName,
        publicRepoURL,
        getAccessToken: isAuthenticated
          ? () => getAccessTokenSilently()
          : undefined,
      });

      if (!result.success) {
        setDeleteError(result.error ?? 'Failed to delete schema');
        return;
      }

      /* Switch to master schema after deletion */
      selectSchema(null);
      /* Deep clone master schema - masterSchema is already ISchemaInfo[] */
      const clonedMasterSchema = structuredClone(masterSchema);
      setSchemaInfo(clonedMasterSchema);
      setOriginalSchemaContent(masterSchema);

      /* Refresh user files to remove the deleted schema */
      await invalidateUserFiles();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Failed to delete schema',
      );
    } finally {
      setDeleting(false);
    }
  }, [
    selectedSchemaName,
    promptModal,
    setDeleting,
    setDeleteError,
    publicRepoURL,
    isAuthenticated,
    getAccessTokenSilently,
    selectSchema,
    setSchemaInfo,
    setOriginalSchemaContent,
    invalidateUserFiles,
  ]);

  const currentDropdownValue = selectedSchemaName ?? '__master__';

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Schema Dropdown */}
        <div className="flex-1">
          <label
            htmlFor="schema-selector"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Select Schema
            {isCurrentSchemaDirty && (
              <span className="ml-2 text-yellow-400 text-xs">
                (unsaved changes)
              </span>
            )}
          </label>
          <select
            id="schema-selector"
            value={currentDropdownValue}
            onChange={onDropdownChange}
            disabled={isSaving || isDeleting}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="__master__">Master Schema (Default)</option>
            {availableSchemas.map((schema) => (
              <option key={schema.name} value={schema.name}>
                {schema.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-end gap-2">
          {/* Save Button */}
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={!isCurrentSchemaDirty || isSaving || isDeleting}
            title={
              !isCurrentSchemaDirty
                ? 'No changes to save'
                : isSaving
                  ? 'Saving...'
                  : 'Save schema'
            }
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              isCurrentSchemaDirty && !isSaving && !isDeleting
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <SaveIcon fontSize="small" />
            <span className="hidden sm:inline">
              {isSaving ? 'Saving...' : 'Save'}
            </span>
          </button>

          {/* Create New Button */}
          <button
            type="button"
            onClick={() => {
              void handleCreate();
            }}
            disabled={isSaving || isDeleting}
            title="Create new schema"
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AddIcon fontSize="small" />
            <span className="hidden sm:inline">New</span>
          </button>

          {/* Duplicate Button */}
          <button
            type="button"
            onClick={() => {
              void handleDuplicate();
            }}
            disabled={isSaving || isDeleting}
            title="Duplicate current schema"
            className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DuplicateIcon fontSize="small" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => {
              void handleDelete();
            }}
            disabled={selectedSchemaName === null || isSaving || isDeleting}
            title={
              selectedSchemaName === null
                ? 'Cannot delete master schema'
                : isDeleting
                  ? 'Deleting...'
                  : 'Delete schema'
            }
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
              selectedSchemaName !== null && !isSaving && !isDeleting
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <DeleteIcon fontSize="small" />
            <span className="hidden sm:inline">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </span>
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {saveError !== null && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-md">
          <p className="text-sm text-red-400">Save Error: {saveError}</p>
        </div>
      )}
      {deleteError !== null && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-md">
          <p className="text-sm text-red-400">Delete Error: {deleteError}</p>
        </div>
      )}

      {/* Current Schema Info */}
      <div className="mt-3 text-xs text-gray-400">
        {selectedSchemaName === null ? (
          <span>
            Using default master schema.{' '}
            {isCurrentSchemaDirty && 'Save to create a new schema file.'}
          </span>
        ) : (
          <span>
            File:{' '}
            <code className="text-gray-300">
              Schemas/{selectedSchemaName}.json
            </code>
          </span>
        )}
      </div>
    </div>
  );
}

export default SchemaSelector;
