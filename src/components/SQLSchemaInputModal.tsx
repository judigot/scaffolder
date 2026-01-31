import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import { useFormStore } from '@/useFormStore.ts';
import { useModalStore } from '@/useModalStore.ts';
import useTransformationsStore from '@/useTransformationsStore.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';
import { type FormEvent, useEffect, useRef, useState } from 'react';

interface IForm {
  SQLSchemaEditable: string;
}

function SQLSchemaInputModal() {
  const { dbConnection } = useFormStore();
  const { isSQLSchemaModalOpen, setIsSQLSchemaModalOpen, SQLSchemaEditable } =
    useModalStore();
  const { setIntrospectedSchema } = useTransformationsStore();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formData, setFormData] = useState<IForm>({ SQLSchemaEditable: '' });
  const [isEdited, setIsEdited] = useState<boolean>(false);

  useEffect(() => {
    setFormData({ SQLSchemaEditable });
    setIsEdited(false);
  }, [SQLSchemaEditable]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isSQLSchemaModalOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isSQLSchemaModalOpen]);

  const handleInputChange = (e: FormEvent<HTMLTextAreaElement>) => {
    const { value } = e.currentTarget;
    setFormData({ SQLSchemaEditable: value });
    setIsEdited(true);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    function isSchemaInput(data: unknown): data is IForm {
      return (
        data !== null &&
        typeof data === 'object' &&
        'SQLSchemaEditable' in data &&
        typeof data.SQLSchemaEditable === 'string'
      );
    }

    if (isSchemaInput(data)) {
      fetch(`${getApiUrl()}/executeCustomSchema`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbConnection,
          SQLSchemaEditable: data.SQLSchemaEditable,
        }),
      })
        .then((response) => response.json())
        .then((schemaInfoNew: ISchemaInfo[]) => {
          setIntrospectedSchema(schemaInfoNew);
        })
        .catch(() => {
          // Handle error
        });

      setIsSQLSchemaModalOpen(false);
      setIsEdited(false);
      resetForm();
    }
  };

  const handleClose = () => {
    if (!isEdited) {
      setIsSQLSchemaModalOpen(false);
      resetForm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && !isEdited) {
      setIsSQLSchemaModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setIsEdited(false);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === dialogRef.current && !isEdited) {
          setIsSQLSchemaModalOpen(false);
          resetForm();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isEdited) {
          setIsSQLSchemaModalOpen(false);
          resetForm();
        }
      }}
      className="backdrop:bg-black backdrop:bg-opacity-50 bg-transparent p-0 max-w-md w-full"
    >
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg space-y-4">
        <h1 className="text-lg font-bold text-white">Edit SQL Schema</h1>
        <form
          id="schemaInputForm"
          name="schemaInputForm"
          className="flex flex-col space-y-4"
          onSubmit={handleSubmit}
        >
          <div>
            <textarea
              id="SQLSchemaEditable"
              name="SQLSchemaEditable"
              value={formData.SQLSchemaEditable}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={10}
              className="h-[150px] p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="mt-2 px-4 py-2 bg-gray-500 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              onClick={() => {
                setIsSQLSchemaModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Execute Query
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

export default SQLSchemaInputModal;
