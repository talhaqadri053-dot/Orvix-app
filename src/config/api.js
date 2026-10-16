import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const DEFAULT_API_PATH = '/orvix/orvixone/public/api/v1';
const DEFAULT_TIMEOUT_MS = 15000;

function getDefaultHost() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  const expoHost = hostUri?.replace(/^[a-z]+:\/\//, '').split(/[/:]/)[0];

  if (Platform.OS === 'android' && !Device.isDevice) {
    return '10.0.2.2';
  }

  if (Platform.OS !== 'web' && expoHost) {
    return expoHost;
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/$/, '');
}

function resolveBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL
    ? normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL)
    : null;

  // When running in the browser, use the browser's current host
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (configuredUrl) {
      return configuredUrl;
    }

    const hostname = window.location?.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost${DEFAULT_API_PATH}`;
    }
    if (hostname) {
      return `http://${hostname}${DEFAULT_API_PATH}`;
    }
  }

  const expoHost = getDefaultHost();

  if (configuredUrl) {
    // If the configured URL has a LAN IP (192.168.x.x, 10.x.x.x), but Metro bundler reports a different LAN host,
    // use the active Metro host so the app never breaks when switching Wi-Fi networks
    try {
      const match = configuredUrl.match(/https?:\/\/([^/:]+)/);
      const configuredHost = match ? match[1] : null;
      const isPrivateIp = (h) => /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(h);
      if (
        expoHost &&
        expoHost !== 'localhost' &&
        expoHost !== '10.0.2.2' &&
        configuredHost &&
        isPrivateIp(configuredHost) &&
        isPrivateIp(expoHost) &&
        configuredHost !== expoHost
      ) {
        console.log(`[API] Active Metro host (${expoHost}) differs from configured IP (${configuredHost}). Using active host.`);
        return configuredUrl.replace(`://${configuredHost}`, `://${expoHost}`);
      }
    } catch {
      // ignore
    }
    return configuredUrl;
  }

  return `http://${expoHost}${DEFAULT_API_PATH}`;
}

export const API_BASE_URL = resolveBaseUrl();

export const API_TIMEOUT_MS = Number.parseInt(
  process.env.EXPO_PUBLIC_API_TIMEOUT_MS || `${DEFAULT_TIMEOUT_MS}`,
  10,
);

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(API_TIMEOUT_MS) ? API_TIMEOUT_MS : DEFAULT_TIMEOUT_MS,
};
