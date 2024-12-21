import { IFile } from '@/components/FileViewer.tsx';
import { createFile } from '@/helpers/stringHelper.ts';

const createBaseController = (): IFile => {
  const template = `
import axios from 'axios';

export default function AxiosInterceptor() {
  axios.interceptors.request.use(
    (config) => {
      const accessToken: string = localStorage.getItem('accessToken') ?? '';
      // const accessToken: string = getToken("accessToken");

      config.headers['Content-Type'] = 'application/json';
      config.headers.Authorization = accessToken ? \`Bearer \${accessToken}\` : \`\`;

      return config;
    },

    (error) => Promise.reject(new Error(\`Response error: \${String(error)}'}\`)),
  );
  axios.interceptors.response.use(
    (response) => response,

    (error) => Promise.reject(new Error(\`Response error: \${String(error)}'}\`)),
  );
}

export const getCookie = (cookieID: string): string => {
  const cookieName = cookieID + '=';
  const cookies = decodeURIComponent(document.cookie).split(';');

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();
    if (trimmedCookie.startsWith(cookieName)) {
      return trimmedCookie.substring(cookieName.length);
    }
  }

  return '';
};
`;

  const replacements = {};

  const content = createFile({ template, replacements });

  return {
    type: 'file',
    name: 'axiosInterceptor.ts',
    content,
  };
};

export default createBaseController;
