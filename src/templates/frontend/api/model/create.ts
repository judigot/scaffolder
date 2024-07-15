import { customFetch } from "../customFetch";
import { IModelTemplate } from "../../interfaces/ModelTemplate";

type IBody = Omit<IModelTemplate, 'id'>;

export const createModelTemplate = async (
  formData: IBody,
): Promise<IBody | undefined> => {
  const result: IBody | undefined = await customFetch.post({
    url: `/modelTemplate`,
    body: JSON.stringify(formData),
  });
  return result;
};

