import { useAuth0 } from '@auth0/auth0-react';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import { SimpleSelect } from '@/components/UI/GroupedSelect.tsx';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import masterSchema from '@/schema-infos/masterSchema.ts';
import { deleteSchema, saveSchema } from '@/services/schemaService.ts';
import { useFormStore } from '@/useFormStore.ts';
import { useMockDatabaseStore } from '@/useMockDatabaseStore.ts';
import { useSchemaStore } from '@/useSchemaStore.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';

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
    (value: string) => {
      void handleSchemaChange(value);
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
    <div className="form-group">
      {/* Label */}
      <span className="form-label text-center">
        Schema:
        {isCurrentSchemaDirty && (
          <span className="ml-1 text-yellow-400">*</span>
        )}
      </span>

      {/* Schema Dropdown */}
      <SimpleSelect
        id="schema-selector"
        value={currentDropdownValue}
        onChange={onDropdownChange}
        disabled={isSaving || isDeleting}
        options={[
          { value: '__master__', label: 'Master Schema (Default)' },
          ...availableSchemas.map((schema) => ({
            value: schema.name,
            label: schema.name,
          })),
        ]}
        aria-label="Select schema"
      />

      {/* Action Buttons Row */}
      <div className="flex items-center gap-1 mt-2">
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
          className={`btn-sm btn-icon flex-1 ${
            isCurrentSchemaDirty && !isSaving && !isDeleting
              ? 'btn-success'
              : 'btn-secondary opacity-50 cursor-not-allowed'
          }`}
        >
          <SaveIcon sx={{ fontSize: 14 }} />
          <span className="text-xs">Save</span>
        </button>

        {/* Create New Button */}
        <button
          type="button"
          onClick={() => {
            void handleCreate();
          }}
          disabled={isSaving || isDeleting}
          title="Create new schema"
          className="btn-sm btn-icon btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <AddIcon sx={{ fontSize: 14 }} />
        </button>

        {/* Duplicate Button */}
        <button
          type="button"
          onClick={() => {
            void handleDuplicate();
          }}
          disabled={isSaving || isDeleting}
          title="Duplicate current schema"
          className="btn-sm btn-icon btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DuplicateIcon sx={{ fontSize: 14 }} />
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
          className={`btn-sm btn-icon flex-1 ${
            selectedSchemaName !== null && !isSaving && !isDeleting
              ? 'btn-danger'
              : 'btn-secondary opacity-50 cursor-not-allowed'
          }`}
        >
          <DeleteIcon sx={{ fontSize: 14 }} />
        </button>
      </div>

      {/* Error Messages */}
      {saveError !== null && (
        <p className="text-xs text-danger-400 mt-1">{saveError}</p>
      )}
      {deleteError !== null && (
        <p className="text-xs text-danger-400 mt-1">{deleteError}</p>
      )}

      {/* Current Schema Info */}
      <p className="text-xs text-fg-muted mt-1">
        {selectedSchemaName === null
          ? 'Using default master schema.'
          : `File: Schemas/${selectedSchemaName}.json`}
      </p>
    </div>
  );
}

export default SchemaSelector;
