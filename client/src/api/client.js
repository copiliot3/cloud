import { API_BASE } from '../utils/constants';

/**
 * Base API client with error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  // Don't set Content-Type for FormData (uploads)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  // Check if response is a file download
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/zip') || contentType.includes('application/octet-stream'))) {
    return response.blob();
  }

  return response.json();
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  upload: (endpoint, formData) => request(endpoint, { method: 'POST', body: formData }),
};
