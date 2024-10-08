import { customFetch } from '../customFetch';
import { IModelTemplate } from '../../interfaces/interfaces';

type IBody = IModelTemplate;

export const updateModelTemplate = async (formData: IBody): Promise<IBody> => {
  const result: IBody = await customFetch.patch({
    url: `/modelTemplate`,
    body: JSON.stringify(formData),
  });
  return result;
};
