import { customFetch } from '../customFetch';
import { IModelTemplate } from '../../interfaces/interfaces';

type IBody = Omit<IModelTemplate, 'PRIMARY_KEY' | 'created_at' | 'updated_at'>;

export const createModelTemplate = async (
  formData: IBody,
): Promise<IBody | undefined> => {
  const result: IBody | undefined = await customFetch.post({
    url: `/modelTemplate`,
    body: JSON.stringify(formData),
  });
  return result;
};
