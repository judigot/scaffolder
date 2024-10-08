import { customFetch } from '../customFetch';

export const deleteModelTemplate = async (id: number): Promise<void> => {
  await customFetch.delete({
    url: `/modelTemplate/${String(id)}`,
  });
};
