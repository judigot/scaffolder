import { IFile } from '@/components/FileViewer';
import { createFile } from '@/helpers/stringHelper';

const createBaseController = (): IFile => {
  const template = `
import axios from 'axios';

const BASE_API_URL = 'http://127.0.0.1:8000/api';

const axiosInstance = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
`;

  const replacements = {};

  const content = createFile({ template, replacements });

  return {
    type: 'file',
    name: 'axiosInstance.ts',
    content,
  };
};

export default createBaseController;
