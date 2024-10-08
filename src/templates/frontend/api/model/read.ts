import { customFetch } from '../customFetch';
import { IModelTemplate } from '../../interfaces/interfaces';

type IBody = IModelTemplate;

export const readModelTemplate = async (): Promise<IBody[] | null> => {
  const result: IBody[] | null = await customFetch.get({
    url: `/modelTemplate`,
  });
  return result;
};
