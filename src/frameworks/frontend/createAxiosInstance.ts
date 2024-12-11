import { IFile } from '@/components/FileViewer';
import { createFile } from '@/helpers/stringHelper';
import { useFormStore } from '@/useFormStore';

const createBaseController = (): IFile => {
  const backendUrl = useFormStore.getState().formData.backendUrl;
  const template = `
import axios from 'axios';

const BASE_API_URL = '{{backendUrl}}';

const axiosInstance = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
`;

  const replacements = {
    backendUrl
  };

  const content = createFile({ template, replacements });

  return {
    type: 'file',
    name: 'axiosInstance.ts',
    content,
  };
};

export default createBaseController;
