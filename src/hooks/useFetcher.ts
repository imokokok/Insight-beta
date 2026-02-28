export interface FetcherOptions {
  timeout?: number;
  signal?: AbortSignal;
}

const inflightRequests = new Map<string, Promise<unknown>>();

export const fetcher = async <T = unknown>(url: string, options?: FetcherOptions): Promise<T> => {
  const { timeout = 10000, signal } = options ?? {};

  const existingRequest = inflightRequests.get(url);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  const request = fetch(url, { signal: controller.signal })
    .then(async (res) => {
      clearTimeout(timeoutId);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      return res.json() as Promise<T>;
    })
    .finally(() => {
      inflightRequests.delete(url);
    });

  inflightRequests.set(url, request);

  return request;
};

export const clearInflightRequests = (): void => {
  inflightRequests.clear();
};
