type DataBody = BodyInit;

const FALLBACK_URL = 'http://localhost:3000/api/v1';

const API_URL: string =
  typeof import.meta.env.API_URL === 'string'
    ? import.meta.env.API_URL
    : FALLBACK_URL;

export interface IFetchOptions extends RequestInit {
  timeout?: number;
  body?: DataBody;
}

export type RequestInterceptor = (
  url: string,
  options: IFetchOptions,
) => IFetchOptions;
export type ResponseInterceptor = (response: Response) => Response;

const defaultOptions: IFetchOptions = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
  },
};

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

export const addRequestInterceptor = (
  interceptor: RequestInterceptor,
): void => {
  requestInterceptors.push(interceptor);
};

export const addResponseInterceptor = (
  interceptor: ResponseInterceptor,
): void => {
  responseInterceptors.push(interceptor);
};

const applyRequestInterceptors = (
  url: string,
  options: IFetchOptions,
): IFetchOptions =>
  requestInterceptors.reduce(
    (acc, interceptor) => interceptor(url, acc),
    options,
  );

const applyResponseInterceptors = (response: Response): Response =>
  responseInterceptors.reduce((acc, interceptor) => interceptor(acc), response);

const determineContentType = (body: DataBody): string => {
  if (body instanceof FormData) {
    return 'multipart/form-data';
  }
  if (typeof body === 'object') {
    return 'application/json';
  }
  return 'text/plain';
};

const customFetchInternal = async <T>(
  url: string,
  options: IFetchOptions = {},
): Promise<T> => {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a valid string');
  }

  const mergedOptions: IFetchOptions = { ...defaultOptions, ...options };

  const finalOptions: IFetchOptions = applyRequestInterceptors(
    url,
    mergedOptions,
  );

  // Ensure headers object exists
  if (!finalOptions.headers) {
    finalOptions.headers = {};
  }

  // Now TypeScript knows headers is an object, so we can safely add properties
  if (
    finalOptions.body !== undefined &&
    !(finalOptions.headers as Record<string, string>)['Content-Type']
  ) {
    (finalOptions.headers as Record<string, string>)['Content-Type'] =
      determineContentType(finalOptions.body);
  }

  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort();
  }, finalOptions.timeout ?? 5000);
  finalOptions.signal = controller.signal;

  try {
    let response: Response = await fetch(`${API_URL}${url}`, finalOptions);
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(
        `There was an HTTP Error with a status code ${String(response.status)}.`,
      );
    }

    response = applyResponseInterceptors(response);
    return await (response.json() as Promise<T>);
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
};

export const customFetch = {
  get: async <T>(params: {
    url: string;
    options?: IFetchOptions;
  }): Promise<T> => {
    const { url, options } = params;
    return customFetchInternal<T>(url, { ...options, method: 'GET' });
  },
  post: async <T>(params: {
    url: string;
    body: DataBody;
    options?: IFetchOptions;
  }): Promise<T> => {
    const { url, body, options } = params;
    return customFetchInternal<T>(url, { ...options, method: 'POST', body });
  },
  put: async <T>(params: {
    url: string;
    body: DataBody;
    options?: IFetchOptions;
  }): Promise<T> => {
    const { url, body, options } = params;
    return customFetchInternal<T>(url, { ...options, method: 'PUT', body });
  },
  patch: async <T>(params: {
    url: string;
    body: DataBody;
    options?: IFetchOptions;
  }): Promise<T> => {
    const { url, body, options } = params;
    return customFetchInternal<T>(url, { ...options, method: 'PATCH', body });
  },
  delete: async <T>(params: {
    url: string;
    options?: IFetchOptions;
  }): Promise<T> => {
    const { url, options } = params;
    return customFetchInternal<T>(url, { ...options, method: 'DELETE' });
  },
};
