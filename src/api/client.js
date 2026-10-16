import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, apiConfig } from '../config/api';

export const BASE_URL = API_BASE_URL;

// Safe cross-platform token storage
export const tokenStorage = {
  async get() {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      }
      return await SecureStore.getItemAsync('auth_token');
    } catch {
      return null;
    }
  },
  async set(token) {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.setItem('auth_token', token);
        return;
      }
      await SecureStore.setItemAsync('auth_token', token);
    } catch (e) {
      console.warn('Failed to save auth token', e);
    }
  },
  async remove() {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.removeItem('auth_token');
        return;
      }
      await SecureStore.deleteItemAsync('auth_token');
    } catch (e) {
      console.warn('Failed to remove auth token', e);
    }
  },
};

const api = axios.create({
  ...apiConfig,
  headers: {
    Accept: 'application/json',
  },
});

let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = details.status ?? null;
    this.errors = details.errors ?? {};
    this.code = details.code ?? null;
    this.isNetworkError = details.isNetworkError ?? false;
    this.isTimeout = details.isTimeout ?? false;
    this.response = details.response ?? null;
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export function normalizeApiError(error) {
  const status = error?.response?.status ?? null;
  const responseData = error?.response?.data;
  const isTimeout = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
  const isNetworkError = !error?.response;

  let message = responseData?.message;
  if (!message) {
    if (isTimeout) message = 'The request timed out. Please try again.';
    else if (isNetworkError) message = 'Unable to connect to ORVIX. Check your internet connection.';
    else if (status === 401) message = 'Your session has expired. Please log in again.';
    else if (status === 403) message = 'You are not allowed to perform this action.';
    else if (status === 404) message = 'The requested resource was not found.';
    else if (status === 422) message = 'Please check the highlighted fields.';
    else if (status === 429) message = 'Too many requests. Please try again shortly.';
    else if (status >= 500) message = 'ORVIX is temporarily unavailable. Please try again.';
    else message = 'Something went wrong. Please try again.';
  }

  return new ApiError(message, {
    status,
    errors: responseData?.errors ?? {},
    code: error?.code,
    isNetworkError,
    isTimeout,
    response: error?.response ?? null,
  });
}

function logApiRequestError(error) {
  const requestConfig = error?.config;
  const targetUrl = requestConfig ? api.getUri(requestConfig) : API_BASE_URL;
  const details = error?.toJSON?.() || {};

  if (details.config?.headers) {
    for (const header of Object.keys(details.config.headers)) {
      if (['authorization', 'cookie', 'set-cookie'].includes(header.toLowerCase())) {
        details.config.headers[header] = '[redacted]';
      }
    }
  }
  if (details.config?.data) {
    details.config.data = '[redacted]';
  }

  console.error('[API] Request failed', {
    targetUrl,
    method: requestConfig?.method?.toUpperCase() || null,
    status: error?.response?.status ?? null,
    responseData: error?.response?.data ?? null,
    message: error?.message,
    error: details,
  });
}

// Attach stored token
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    // Axios must set the multipart boundary itself.
    delete config.headers?.['Content-Type'];
  }

  return config;
});

// Clear token on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    logApiRequestError(error);
    if (error?.response?.status === 401) {
      await tokenStorage.remove();
      if (unauthorizedHandler) {
        await unauthorizedHandler();
      }
    }
    return Promise.reject(normalizeApiError(error));
  }
);



export default api;