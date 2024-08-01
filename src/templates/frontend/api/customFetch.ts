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

  // Type guard to check if headers is Record<string, string>
  const isHeadersObject = (
    headers: HeadersInit,
  ): headers is Record<string, string> => {
    return typeof headers === 'object' && !(headers instanceof Headers);
  };

  // Ensure headers object exists
  if (!finalOptions.headers) {
    finalOptions.headers = {};
  }

  // Determine content type if body is present and Content-Type header is not set
  if (
    finalOptions.body !== undefined &&
    isHeadersObject(finalOptions.headers)
  ) {
    if (!('Content-Type' in finalOptions.headers)) {
      finalOptions.headers['Content-Type'] = determineContentType(
        finalOptions.body,
      );
    }
  }

  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort();
  }, finalOptions.timeout ?? 5000);
  finalOptions.signal = controller.signal;

  try {
    const response: Response = await fetch(`${API_URL}${url}`, finalOptions);
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(
        `There was an HTTP Error with a status code ${String(response.status)}.`,
      );
    }

    const interceptedResponse = applyResponseInterceptors(response);

    const responseData: unknown = await interceptedResponse.json();

    // Type guard to check if responseData is T
    const isT = (data: unknown): data is T => {
      // Basic runtime check for object, you might want to add more checks here based on your requirements
      return typeof data === 'object' && data !== null;
    };

    if (!isT(responseData)) {
      throw new Error('Response data is not of expected type');
    }

    return responseData;
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
