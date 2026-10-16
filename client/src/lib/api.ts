const rawBase = import.meta.env.VITE_API_URL || '';
// Normalize base URL: strip trailing slash and optional trailing /api to prevent duplication
export const API_BASE_URL = rawBase.replace(/\/+$/, '').replace(/\/api$/, '');

export const getApiUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE_URL}${path}`;
};

export const fetchApi = async (url: string, options: RequestInit = {}) => {
  const fullUrl = getApiUrl(url);
  const res = await fetch(fullUrl, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || 'An error occurred');
  }
  return data;
};
